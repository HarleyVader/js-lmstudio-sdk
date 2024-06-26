//server.js
const express = require('express');
const { fork } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const socketIO = require('socket.io');
const { LMStudioClient } = require('@lmstudio/sdk');

const PORT = 6969;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Initialize the LMStudio SDK
const client = new LMStudioClient({
    baseUrl: 'ws://192.168.0.178:1234', // Replace with your LMStudio server address
});

let roleplay; // This will hold the model instance

// Load the model once when the server starts
client.llm.load('Orenguteng/Llama-3-8B-Lexi-Uncensored-GGUF/Lexi-Llama-3-8B-Uncensored_Q5_K_M.gguf', {
    config: {
        gpuOffload: 0.9,
        context_length: 8176,
        embedding_length: 8176,
    },
}).then(model => {
    roleplay = model;
    console.log('Model loaded successfully');
}).catch(error => {
    console.error('Error loading the model:', error);
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.get('/images', async (req, res) => {
    const directoryPath = path.join(__dirname, 'images');
    const files = await fs.readdir(directoryPath);
    let html = '<html><body>';
    files.forEach(file => {
        if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
            html += `<img src="/images/${file}" width="64" height="64" />`;
        }
    });
    html += '</body></html>';
    res.send(html);
});

let userSessions = new Map();

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    const worker = fork('./worker.js');
    userSessions.set(socket.id, worker);

    console.log(`Number of connected clients: ${userSessions.size}`);

    socket.on('message', (message) => {
        const worker = userSessions.get(socket.id);
        if (worker) {
            // Sending a model ID or necessary configuration instead of the model instance
            worker.send({ type: 'message', data: message, socketId: socket.id, modelConfig: roleplay.config });
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        const worker = userSessions.get(socket.id);
        if (worker) {
            worker.send({ type: 'disconnect', socketId: socket.id });
            worker.kill();
        }
        userSessions.delete(socket.id);
        console.log(`Number of connected clients: ${userSessions.size}`);
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`);
});