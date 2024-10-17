const express = require("express");
const os = require('os');
const path = require('path');
const fs = require("fs");
const http = require("http");
const { Worker } = require("worker_threads");
const { Server } = require("socket.io");
const readline = require("readline");
const cors = require('cors');
const axios = require("axios");
const chalk = require('chalk');

bambisleepChalk = chalk;

// Define the project's color scheme
const colors = {
  primary: 'rgba(17, 39, 39, 1)',
  primaryAlt: 'rgba(33, 105, 105, 1)',
  secondary: 'rgba(31, 1, 23, 1)',
  tertiary: 'rgba(242, 242, 242, 1)',
  button: 'rgba(212, 4, 108, 1)',
  buttonAlt: 'rgba(17, 0, 0, 1)',
  secondaryAlt: 'rgba(1, 124, 138, 1)'
};

// Create custom Chalk styles
bambisleepChalk = {
  primary: chalk.hex(colors.primary),
  primaryAlt: chalk.hex(colors.primaryAlt),
  secondary: chalk.hex(colors.secondary),
  tertiary: chalk.hex(colors.tertiary),
  button: chalk.hex(colors.button),
  buttonAlt: chalk.hex(colors.buttonAlt),
  secondaryAlt: chalk.hex(colors.secondaryAlt),
  error: chalk.hex(colors.button).bold,
  success: chalk.hex(colors.primaryAlt).bold,
  info: chalk.hex(colors.secondaryAlt).bold,
  warning: chalk.hex(colors.primary).bold
};

const PORT = 6969;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.setMaxListeners(20);

function getCircularReplacer() {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  };
}

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
app.set('views', path.join(__dirname, 'views'));

const chatHistoryPath = path.join(__dirname, 'public/history', 'chatHistory.json');
if (!fs.existsSync(chatHistoryPath)) {
  fs.writeFileSync(chatHistoryPath, JSON.stringify([]), 'utf8');
}

// Function to save session histories
async function saveSessionHistories(socketId) {
  if (sessionHistories && sessionHistories[socketId]) {
    const Histories = Array.from(sessionHistories[socketId]);
    // Proceed with saving Histories to a JSON file
    const jsonHistory = JSON.stringify(Histories);
    const fileName = `${socketId}.json`;
    const filePath = path.join(__dirname, "/public/history", fileName);

    // Log the session history
    console.log(chalk.blue(`Session history for socket ID ${socketId}:`), jsonHistory);

    fs.writeFile(filePath, jsonHistory, (error) => {
      if (error) {
        console.error(chalk.red(`Error saving message history for socket ID: ${socketId}`), error);
      } else {
        console.log(chalk.green(`Message history saved for socket ID: ${socketId}`));
      }
    });
  } else {
    console.error(chalk.red(`No valid session history found for socket ID: ${socketId}`));
  }
}

// Function to update chat history
function updateChatHistory(index, type, callback) {
  fs.readFile(chatHistoryPath, 'utf8', (err, data) => {
    if (err) {
      console.error(chalk.red('Error reading chat history:'), err);
      return callback(err);
    }

    let chatHistory;
    try {
      chatHistory = data ? JSON.parse(data) : [];
    } catch (parseErr) {
      console.error(chalk.red('Error parsing chat history JSON:'), parseErr);
      chatHistory = [];
    }

    if (type === 'up') {
      chatHistory[index].votes = (chatHistory[index].votes || 0) + 1;
    } else if (type === 'down') {
      chatHistory[index].votes = (chatHistory[index].votes || 0) - 1;
    }

    fs.writeFile(chatHistoryPath, JSON.stringify(chatHistory), (err) => {
      if (err) {
        console.error(chalk.red('Error saving chat history:'), err);
        return callback(err);
      }
      callback(null, chatHistory[index].votes);
    });
  });
}

// Handle connection
io.on("connection", (socket) => {
  userSessions.add(socket.id);

  // Create a new worker for this client
  const worker = new Worker("./worker.js");
  workers.set(socket.id, worker);

  // Store the socket object in the shared context
  socketStore.set(socket.id, socket);
  console.log(chalk.blue(`Client connected: ${socket.id} clients: ${userSessions.size} sockets: ${socketStore.size} workers: ${workers.size}`));

  // Ensure socket.request.app is defined
  socket.request.app = app;

  // Handle HTTP requests within the socket connection
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

  app.get('/history', (req, res) => {
    fs.readFile(chatHistoryPath, 'utf8', (err, data) => {
      if (err) {
        console.error(chalk.red('Error reading chat history:'), err);
        res.status(500).send('Error reading chat history');
        return;
      }

      let chatHistory;
      try {
        chatHistory = data ? JSON.parse(data) : [];
      } catch (parseErr) {
        console.error(chalk.red('Error parsing chat history JSON:'), parseErr);
        chatHistory = [];
      }

      res.render('history', { chatHistory });
    });
  });

  app.get('/updateChatHistory/:index/:type', (req, res) => {
    const index = req.params.index;
    const type = req.params.type;

    updateChatHistory(index, type, (err, votes) => {
      if (err) {
        res.status(500).send('Error updating chat history');
      } else {
        res.json({ votes });
      }
    });
  });

  app.post('/vote/:index/:type', (req, res) => {
    const index = req.params.index;
    const type = req.params.type;

    updateChatHistory(index, type, (err, votes) => {
      if (err) {
        res.status(500).send('Error updating chat history');
      } else {
        res.json({ votes });
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

  socket.on("message", (message) => {
    //console.log(chalk.yellow(`Message from ${socket.id}: ${message}`));
    const filteredMessage = filter(message);
    //console.log(chalk.yellow(`Filtered message: ${filteredMessage}`));
    worker.postMessage({
      type: "message",
      data: filteredMessage,
      triggers: "",
      socketId: socket.id,
    });
  });

  socket.on("triggers", (triggers) => {
    //console.log(chalk.magenta(`Triggers from ${socket.id}: ${triggers}`));
    worker.postMessage({ type: "triggers", triggers });
  });

  socket.on("disconnect", async (socket) => {
   await worker.postMessage({ type: "disconnect", socketId: socket.id });
   terminator(msg.socketId);
  });

  worker.on("messageHistory", async (msg) => {
    console.log(chalk.cyan(`Message from worker: ${JSON.stringify(msg, getCircularReplacer())}`));
    saveSessionHistories(msg.data, msg.socketId);
  });

  worker.on("message", async (msg) => {
    
    if (msg.type === "log") {
      console.log(chalk.magenta(msg.data, msg.socketId));
    } else if (msg.type === 'response') {
      const responseData = typeof msg.data === 'object' ? JSON.stringify(msg.data) : msg.data;
      //console.log(chalk.cyan(`Response from worker: ${responseData}`));
      io.to(msg.socketId).emit("response", responseData);
      //console.log(chalk.cyan(`Response to ${msg.socketId}: ${responseData}`));
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
    console.log(chalk.red(`Client disconnected: ${socketId} clients: ${userSessions.size} sockets: ${socketStore.size} workers: ${workers.size}`));
  }
});

rl.on("line", async (line) => {
  if (line === "update") {
    console.log(chalk.green("Update mode"));
    io.emit("update");
  } else if (line === "normal") {
    io.emit("update");
    console.log(chalk.green("Normal mode"));
  } else {
    console.log(chalk.red("Invalid command! update or normal"));
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
        console.error(chalk.red("Error fetching TTS audio:"), error);
        console.error(chalk.red("Error details:"), error.response ? error.response.data : error.message);
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
  console.log(chalk.green(`Server is running on http://${getServerAddress()}:${PORT}`));
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
