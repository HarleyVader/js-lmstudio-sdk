const express = require("express");
const path = require('path');
const fs = require("fs").promises;
const http = require("http");
const { Server } = require("socket.io");
const { Worker } = require("worker_threads");
const { LMStudioClient } = require("@lmstudio/sdk");
const readline = require("readline");
const cors = require('cors');
const axios = require("axios");
const Sentry = require("@sentry/node");


const app = express();
const server = http.createServer(app);
const io = new Server(server);

Sentry.setupExpressErrorHandler(app);

const PORT = 6969;

// Create a readline interface to read from the terminal
const rl = readline.createInterface({
  input: process.stdin, //standard terminal device input
  output: process.stdout, //standard terminal device output
});

// Increase the max listeners for the readline interface
rl.setMaxListeners(20);

const filteredWords = require("./fw.json");
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

async function sessionHistories(data, socketId) {
  sessionHistories[socketId] = data;

  if (!sessionHistories[socketId]) {
    console.error(`No valid session history found for socket ID: ${socketId}`);
    return;
  } else if (sessionHistories[socketId]) {
    const Histories = Array.from(sessionHistories[socketId]);
    const jsonHistory = JSON.stringify(Histories);
    const fileName = `${socketId}.json`;
    const filePath = path.join(__dirname, "history", fileName);

    await fs
      .writeFile(filePath, jsonHistory)
      .then(() => {
        console.log(`Message history saved for socket ID: ${socketId}`);
      })
      .catch((error) => {
        console.error(
          `Error saving message history for socket ID: ${socketId}`,
          error
        );
      });
  }
}

let roleplay;
// Load the model once
const client = new LMStudioClient({
  baseUrl: "ws://192.168.0.178:1234", // Replace with your LMStudio server address
});


//TheBloke/SOLAR-10.7B-Instruct-v1.0-uncensored-GGUF/solar-10.7b-instruct-v1.0-uncensored.Q4_K_M.gguf
//TheBloke/SOLAR-10.7B-Instruct-v1.0-uncensored-GGUF/solar-10.7b-instruct-v1.0-uncensored.Q8_0.gguf
const modelConfig = {
  identifier:
    "TheBloke/SOLAR-10.7B-Instruct-v1.0-uncensored-GGUF/solar-10.7b-instruct-v1.0-uncensored.Q4_K_M.gguf", 
  config: {
    gpuOffload: 0.4,
    context_length: 8192,
    embedding_length: 512,
  },
};

async function loadModel() {
  if (!roleplay) {
    await client.llm.get({});
  } else {
    await client.llm.load(modelConfig.identifier, {
      config: modelConfig.config,
    });
  }
}

let userSessions = new Set();
let workers = new Map();
let socketStore = new Map(); // Shared context for socket objects

loadModel();

//Serve static files from the 'public' directory
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

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

  rl.on("line", async (line) => {
    if (line === "update") {
      console.log("Update mode");
      io.emit("update");
    } else if (line === "normal") {
      io.emit("update");
      console.log("Normal mode");
    } else {
      console.log("Invalid command! update or normal");
    }
  });
});


const telemetry = require(path.join(__dirname, 'public', 'telemetry', 'instrument.js'));

// sentry error handling
app.use(function onError(err, req, res, next) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  res.statusCode = 500;
  res.end(res.sentry + "\n");
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


// Start the server
server.listen(PORT, () => {
  console.log(`Server listening on *:${PORT}`);
});



/*
const { MongoClient } = require('mongodb');
const axios = require("axios");
const uri = "mongodb://localhost:27017"; // Replace with your MongoDB connection string
const clientDB = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

clientDB.connect(err => {
    if (err) {
        console.error('Error connecting to MongoDB:', err);
        return;
    }
    console.log('Connected to MongoDB');
    const db = clientDB.db('chatDB');
    const messagesCollection = db.collection('messages');

    // Save client message and LLM replies
    io.on('connection', (socket) => {
        socket.on('message', async (prompt) => {
            const timestamp = new Date();
            const message = {
                socketId: socket.id,
                timestamp: timestamp,
                prompt: prompt,
                reply: null
            };

            try {
                // Save the client message
                await messagesCollection.insertOne(message);
                console.log('Client message saved to MongoDB');

                // Generate reply from LLM
                const reply = await client.llm.generate(prompt);
                message.reply = reply;

                // Save the reply
                await messagesCollection.updateOne(
                    { _id: message._id },
                    { $set: { reply: reply } }
                );
                console.log('LLM reply saved to MongoDB');

                // Send the reply back to the client
                socket.emit('message', reply);
            } catch (error) {
                console.error('Error saving message or generating reply:', error);
            }
        });
    });
});
*/
