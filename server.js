const express = require("express");
const os = require('os');
const path = require('path');
const fs = require("fs");
const http = require("http");
const https = require('https');
const { Worker } = require("worker_threads");
const { Server } = require("socket.io");
const readline = require("readline");
const cors = require('cors');
const axios = require("axios");

const PORT = 6969;
const WSS_PORT = 4848;

/*
const options = {
  key: fs.readFileSync(path.join(os.homedir(), 'conf/web/bambisleep.chat/ssl/bambisleep.chat.key')),
  cert: fs.readFileSync(path.join(os.homedir(), 'conf/web/bambisleep.chat/ssl/bambisleep.chat.pem'))
};
*/
const app = express();
const server = http.createServer(app);
const io = new Server(server);
/*
const httpsServer = https.createServer(options, app);
const wss = new Server(httpsServer);
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

app.use(cors({
  origin: 'https://bambisleep.chat',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

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
    fs.readFile(path.join(__dirname, 'public', 'chatHistory.json'), (err, data) => {
      if (err) {
        console.error('Error reading chat history file:', err);
        return res.status(500).send('Internal Server Error');
      }
      if (data.length === 0) {
        console.warn('Chat history file is empty');
        return res.render('history', { chatHistory: [] });
      }
      try {
        const chatHistory = JSON.parse(data);
        res.render('history', { chatHistory });
      } catch (parseErr) {
        console.error('Error parsing chat history JSON:', parseErr);
        res.status(500).send('Internal Server Error');
      }
    });
  });

  app.post('/vote/:index/:type', (req, res) => {
    fs.readFile(path.join(__dirname, 'public', 'chatHistory.json'), (err, data) => {
      if (err) {
        console.error('Error reading chat history file:', err);
        return res.status(500).send('Internal Server Error');
      }
      if (data.length === 0) {
        console.warn('Chat history file is empty');
        return res.status(400).send('Chat history is empty');
      }
      try {
        const chatHistory = JSON.parse(data);
        const index = req.params.index;
        const type = req.params.type;

        if (type === 'up') {
          chatHistory[index].votes = (chatHistory[index].votes || 0) + 1;
        } else if (type === 'down') {
          chatHistory[index].votes = (chatHistory[index].votes || 0) - 1;
        }

        fs.writeFile(path.join(__dirname, 'public', 'chatHistory.json'), JSON.stringify(chatHistory), (err) => {
          if (err) {
            console.error('Error writing chat history file:', err);
            return res.status(500).send('Internal Server Error');
          }
          res.json({ votes: chatHistory[index].votes });
        });
      } catch (parseErr) {
        console.error('Error parsing chat history JSON:', parseErr);
        res.status(500).send('Internal Server Error');
      }
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

  socket.on("messages", (data) => {
    const { bambis, collar, triggers } = data;
    console.log(`Messages from ${socket.id}: bambis: ${bambis}, collar: ${collar}, triggers: ${triggers}`);
    const filteredMessages = {
      bambis: filter(bambis),
      collar: filter(collar),
      triggers: filter(triggers)
    };
    console.log(`Filtered messages:`, filteredMessages);
    worker.postMessage({
      type: "messages",
      data: filteredMessages,
      socketId: socket.id,
    });
  });

  socket.on("disconnect", async () => {
    worker.postMessage({ type: "disconnect", socketId: socket.id });
    terminator(socket.id);
  });

  worker.on("message", (msg) => {
    console.log(`Message from worker: ${JSON.stringify(msg)}`);
    if (msg.type === "log") {
      console.log(msg.data, msg.socketId);
    } else if (msg.type === "messageHistory") {
      saveSessionHistories(msg.data, msg.socketId);
    } else if (msg.type === 'response') {
      const responseData = typeof msg.data === 'object' ? JSON.stringify(msg.data) : msg.data;
      console.log(`Response from worker: ${responseData}`);
      io.to(msg.socketId).emit("response", responseData);
      console.log(`Response to ${msg.socketId}: ${responseData}`);
    }
  });

  function terminator(socketId) {
    userSessions.delete(socketId);
    const worker = workers.get(socketId);
    if (worker) {
      worker.terminate();
    }
    workers.delete(socketId);
    socketStore.delete(socketId);
    console.log(`Client disconnected: ${socketId} clients: ${userSessions.size} sockets: ${socketStore.size} workers: ${workers.size}`);
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
  const text = req.query.text;
  // const speaker_idx = 'jenny/jenny';

  if (typeof text !== "string") {
    return res.status(400).send("Invalid input: text must be a string");
  } else {
    axios
      .get(`http://192.168.0.178:5002/api/tts`, {
        params: { text, /* speaker_idx */ },
        responseType: 'arraybuffer'
      })
      .then((response) => {
        res.setHeader("Content-Type", "audio/wav");
        res.setHeader("Content-Length", response.data.length);
        res.send(response.data);
      })
      .catch((error) => {
        console.error("Error fetching TTS audio:", error);
        console.error("Error details:", error.response ? error.response.data : error.message);
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
/*
wss.listen(WSS_PORT, () => {
  console.log(`Server is running on https://${getServerAddress()}:${WSS_PORT}`);
});
*/
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
