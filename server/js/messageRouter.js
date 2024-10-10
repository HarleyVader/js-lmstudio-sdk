const { Worker } = require("worker_threads");
const axios = require("axios");
const { Message } = require('./config/models');
const { startDatabase } = require('./database');

function startMessageRouter(app, io) {
  let userSessions = new Set();
  let workers = new Map();
  let socketStore = new Map(); // Shared context for socket objects

  const filteredWords = require("../fw.json");

  function filter(message) {
    if (typeof message !== "string") {
      message = String(message);
    }
    return message
      .split(" ")
      .map((word) => {
        return filteredWords.includes(word.toLowerCase()) ? " " : word;
      })
      .join(" ");
  }

  // Handle connection
  io.on("connection", (socket) => {
    userSessions.add(socket.id);
    console.log(`Client connected: ${socket.id} clients: ${userSessions.size}`);

    // Create a new worker for this client
    const worker = new Worker("./worker.js");
    workers.set(socket.id, worker);

    // Store the socket object in the shared context
    socketStore.set(socket.id, socket);

    socket.on("message", async (message) => {
      console.log(`Message from ${socket.id}: ${message}`);
      const filteredMessage = filter(message);
      console.log(`Filtered message: ${filteredMessage}`);

      const userMessage = new Message({
        socketId: socket.id,
        timestamp: new Date(),
        sender: 'user',
        message: filteredMessage
      });

      try {
        // Save the client message
        await userMessage.save();
        console.log('Client message saved to MongoDB');
      } catch (error) {
        console.error('Error saving client message:', error);
      }

      worker.postMessage({
        type: "message",
        data: filteredMessage,
        triggers: "",
        socketId: socket.id,
      });
    });

    socket.on("triggers", (triggers) => {
      worker.postMessage({ type: "triggers", triggers });
    });

    socket.on("disconnect", async () => {
      worker.postMessage({ type: "disconnect", socketId: socket.id });
    });

    function terminator(socketId) {
      userSessions.delete(socketId);
      worker.terminate(socketId);
      workers.delete(socketId);
      console.log(
        `Client disconnected: ${socket.id} clients: ${userSessions.size}`
      );
    }

    worker.on("message", async (msg) => {
      const llmMessage = new Message({
        socketId: msg.socketId,
        timestamp: new Date(),
        sender: 'LLM',
        message: msg.data
      });

      try {
        // Save the LLM message
        await llmMessage.save();
        console.log('LLM message saved to MongoDB');
      } catch (error) {
        console.error('Error saving LLM message:', error);
      }

      if (msg.type === "log") {
        console.log(msg.data, msg.socketId);
      } else if (msg.type === "response") {
        io.to(msg.socketId).emit("response", msg.data);
      } else if (msg.type === "messageHistory") {
        sessionHistories(msg.data, msg.socketId);
        terminator(msg.socketId);
      } else if (msg.type === "triggers") {
        io.to(msg.socketId).emit("triggers", msg.data);
      } else {
        console.error("Unknown message type:", msg.type);
      }
    });
  });

  app.use("/api/tts", (req, res) => {
    const { text } = req.query;
    axios
      .get(`http://0.0.0.0:5002/api/tts?text=${text}`, { responseType: 'arraybuffer' })
      .then((response) => {
        res.setHeader("Content-Type", "audio/wav");
        res.setHeader("Content-Length", response.data.length);
        res.send(response.data);
      })
      .catch((error) => {
        console.error("Error fetching TTS audio:", error);
        res.status(500).send("Error fetching TTS audio");
      });
  });
}

module.exports = { startMessageRouter };