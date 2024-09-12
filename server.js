const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const http = require("http");
const { Server } = require("socket.io");
const { Worker } = require("worker_threads");
const { LMStudioClient } = require("@lmstudio/sdk");
const readline = require("readline");
const cors = require('cors');
const axios = require("axios");


const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 6969;

// Create a readline interface to read from the terminal
const rl = readline.createInterface({
  input: process.stdin, //standard terminal device input
  output: process.stdout, //standard terminal device output
});

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

const modelConfig = {
  identifier:
    "TheBloke/SOLAR-10.7B-Instruct-v1.0-uncensored-GGUF/solar-10.7b-instruct-v1.0-uncensored.Q4_K_S.gguf",
  config: {
    gpuOffload: 0.9,
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

loadModel();
// Handle connection
io.on("connection", (socket) => {
  userSessions.add(socket.id); // Add the new session
  console.log(`Client connected: ${socket.id} clients: ${userSessions.size}`);

  // Create a new worker for this client
  const worker = new Worker("./worker.js");
  workers.set(socket.id, worker);

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
    console.log({ message });
  });

  socket.on("triggers", (triggers) => {
    worker.postMessage({ type: "triggers", triggers});
    worker.postMessage({ type: "log", data: `Triggers: ${triggers}` });
    
  });

  socket.on("disconnect", async () => {
    userSessions.delete(socket.id); // Remove the session

    // Inform worker about the disconnection
    worker.postMessage({ type: "disconnect", socketId: socket.id });
    // Terminate the worker and remove it from the map

    console.log(
      `Client disconnected: ${socket.id} clients: ${userSessions.size}`
    );
    // Kill the worker for the socket
    worker.terminate();
    workers.delete(socket.id);
  });

  // Receive messages from worker and forward them to the appropriate client
  worker.on("message", (msg) => {
    if (msg.type === "log") {
      console.log(msg.data, msg.socketId); // Log worker messages
    } else if (msg.type === "response") {
      io.to(msg.socketId).emit("response", msg.data);
    } else if (msg.type === "messageHistory") {
      sessionHistories(msg.data, msg.socketId);
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

//Serve static files from the 'public' directory
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serve images from the "images" directory
app.use("/images", express.static(path.join(__dirname, "images")));

app.get("/images", async (req, res) => {
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

// Serve help.html from the 'public' directory
app.get("/help", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "help.html"));
});

// Serve psychodelic-trigger-mania.html from the 'public' directory
app.get("/psychodelic-trigger-mania", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "psychodelic-trigger-mania.html")
  );
});

app.use("/api/tts?", (req, res) => {
  const { text } = req.query;
  // Make a request to the TTS server and get the audio file
  // You can use axios or any other HTTP library to make the request
  // Replace "localhost:5002" with the actual TTS server address
  axios
    .get(`http://192.168.0.178:5002/api/tts?text=${text}`)
    .then((response) => {
      // Set the appropriate headers for the audio file
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Disposition", "attachment; filename=tts.mp3");
      // Send the audio file as the response
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
