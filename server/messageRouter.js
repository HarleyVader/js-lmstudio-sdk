const { Worker } = require("worker_threads");
const path = require('path');
const fs = require("fs").promises;
const axios = require("axios");

function startMessageRouter(app, io) {
  let userSessions = new Set();
  let workers = new Map();
  let socketStore = new Map(); // Shared context for socket objects

  // Handle connection
  io.on("connection", (socket) => {
    userSessions.add(socket.id);
    console.log(`Client connected: ${socket.id} clients: ${userSessions.size}`);

    // Create a new worker for this client
    const worker = new Worker("./worker.js");
    workers.set(socket.id, worker);

    // Store the socket object in the shared context
    socketStore.set(socket.id, socket);

    // Ensure socket.request.app is defined
    socket.request.app = app;

    // Handle HTTP requests within the socket connection
    socket.request.app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });

    socket.request.app.use("/images", express.static(path.join(__dirname, "images")));

    socket.request.app.get("/images", async (req, res) => {
      const directoryPath = path.join(__dirname, "images");
      const files = await fs.readdir(directoryPath);
      let html = "<html><body>";
      files.forEach((file) => {
        if (
          file.endsWith(".png") ||
          file.endsWith(".jpg") ||
          file.endsWith(".jpeg")
        ) {
          html += `<img src="/images/${file}" width="64" height="64" />`;
        }
      });
      html += "</body></html>";
      res.send(html);
    });

    socket.request.app.get("/help", (req, res) => {
      res.sendFile(path.join(__dirname, "public", "help.html"));
    });

    socket.request.app.get("/psychodelic-trigger-mania", (req, res) => {
      res.sendFile(
        path.join(__dirname, "public", "psychodelic-trigger-mania.html")
      );
    });

    socket.on("message", (message) => {
      console.log(`Message from ${socket.id}: ${message}`);
      const filteredMessage = filter(message);
      console.log(`Filtered message: ${filteredMessage}`);
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

    worker.on("message", (msg) => {
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