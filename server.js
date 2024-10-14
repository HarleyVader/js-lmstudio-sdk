const express = require("express");
const os = require('os');
const path = require('path');
const fs = require("fs").promises;
const http = require("http");
const { Worker } = require("worker_threads");
const { Server } = require("socket.io");
const readline = require("readline");
const cors = require('cors');
const axios = require("axios");
//const { LMStudioClient } = require('@lmstudio/sdk');

const PORT = 6969;

const app = express();
const server = http.createServer(app);
const io = new Server(server);
/*
try {
 client = new LMStudioClient({
    baseUrl: "ws://192.168.0.178:1234",
  });
} catch (error) {
  console.error('Error initializing LMStudioClient:', error);
}
*/
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

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

let sessionHistories = {};

async function saveSessionHistories(data, socketId) {
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
let userSessions = new Set();
let workers = new Map();
let socketStore = new Map();

// Serve static files from the 'public' directory
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.set('view engine', 'ejs');

// Handle connection
io.on("connection", (socket) => {
  userSessions.add(socket.id);

  // Create a new worker for this client
  const worker = new Worker("./worker.js");
  workers.set(socket.id, worker);

  // Store the socket object in the shared context
  socketStore.set(socket.id, socket);
  console.log(`Client connected: ${socket.id} clients: ${userSessions.size} sockets: ${socketStore.size} workers: ${workers.size}`);

  // Ensure socket.request.app is defined
  socket.request.app = app;

  // Handle HTTP requests within the socket connection
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

  app.get('/history', (req, res) => {
    fs.readFile(path.join(__dirname, 'data', 'chatHistory.json'), (err, data) => {
      if (err) throw err;
      const chatHistory = JSON.parse(data);
      res.render('history', { chatHistory });
    });
  });

  app.post('/vote/:index/:type', (req, res) => {
    fs.readFile(path.join(__dirname, 'data', 'chatHistory.json'), (err, data) => {
      if (err) throw err;
      const chatHistory = JSON.parse(data);
      const index = req.params.index;
      const type = req.params.type;

      if (type === 'up') {
        chatHistory[index].votes = (chatHistory[index].votes || 0) + 1;
      } else if (type === 'down') {
        chatHistory[index].votes = (chatHistory[index].votes || 0) - 1;
      }

      fs.writeFile(path.join(__dirname, 'history', 'voteHistrory.json'), JSON.stringify(chatHistory), (err) => {
        if (err) throw err;
        res.json({ votes: chatHistory[index].votes });
      });
    });
  });

  app.get("/help", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "help.html"));
  });

  app.get("/psychodelic-trigger-mania", (req, res) => {
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

  app.on("triggers", (triggers) => {
    console.log(`Triggers from ${socket.id}: ${triggers}`);
    worker.postMessage({ type: "triggers", triggers });
  });

  app.on("disconnect", async () => {
    worker.postMessage({ type: "disconnect", socketId: socket.id });
    terminator();
  });

  app.on("error", (error) => {
    console.error(`Error from ${socket.id}: ${error}`);
  });

  worker.on("message", (msg) => {
    console.log(`Message from worker: ${JSON.stringify(msg)}`);
    if (msg.type === "log") {
      console.log(msg.data, msg.socketId);
    } else if (msg.type === "messageHistory") {
      saveSessionHistories(msg.data, msg.socketId);
    } else if (msg.type === 'response') {
      console.log(`Response from worker: ${msg}`);
      io.to(msg.socketId).emit("response", msg.data);
      console.log(`Response to ${msg.socketId}: ${msg.data}`);
    }
  });

  function terminator() {
    userSessions.delete(socket.id);
    const worker = workers.get(socket.id);
    if (worker) {
      worker.terminate(socket.id);
    }
    workers.delete(socket.id);
    socketStore.delete(socket.id);
    console.log(`Client disconnected: ${socket.id} clients: ${userSessions.size} sockets: ${socketStore.size} workers: ${workers.size}`);
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

app.use("/api/tts", (req, res) => {
  if (typeof req.query.text !== "string") {
    return res.status(469).send("Invalid input: text must be an encodeURIComponent");
  } else {
    const text = req.query.text;
    axios
      .get(`http://192.178.0.178:5002/api/tts?text=${text}`, { responseType: 'arraybuffer' })
      .then((response) => {
        res.setHeader("Content-Type", "audio/wav");
        res.setHeader("Content-Length", response.data.length);
        res.send(response.data);
      })
      .catch((error) => {
        console.error("Error fetching TTS audio:", error);
        res.status(500).send("Error fetching TTS audio");
      });
  }
});

function getServerAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on http://${getServerAddress()}:${PORT}`);
});

/* removed /images due to lack of images to show
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
*/

/*
const { MongoClient } = require('mongodb');
const axios = require("axios");
const WebSocket = require('ws');

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
