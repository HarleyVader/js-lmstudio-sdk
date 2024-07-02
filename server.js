const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const { Server } = require("socket.io");
const { fork } = require('child_process');
const { LMStudioClient } = require('@lmstudio/sdk');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

const PORT = 6969;

// Initialize the LMStudio SDK
const client = new LMStudioClient({
    baseUrl: 'ws://192.168.0.178:1234', // Replace with your LMStudio server address
});

let modelConfig;

// Load the model at server start
client.llm.load('TheBloke/SOLAR-10.7B-Instruct-v1.0-uncensored-GGUF/solar-10.7b-instruct-v1.0-uncensored.Q4_K_S.gguf', {
    config: {
        gpuOffload: 0.9,
        context_length: 8176,
        embedding_length: 8176,
    },
}).then(model => {
    modelConfig = model.config;
}).catch(error => {
    console.error('Error loading the model:', error);
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve images from the "images" directory
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

let workers = {}; // Map to store workers by socket ID
let userSessions = new Set(); // Set to store active user sessions

// Handle connection
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    userSessions.add(socket.id); // Add the new session
    console.log(`Number of connected clients: ${userSessions.size}`);

    // Fork a new worker for this connection
    const worker = fork('./worker.js');
    // Store the worker with socket ID as key
    workers[socket.id] = worker;

    // Send model configuration to this worker
    worker.send({ type: 'modelConfig', data: modelConfig });

    worker.on('message', (msg) => {
        if (msg.type === 'log') {
            console.log(msg.data); // Log worker messages
        } else if (msg.type === 'response') {
            io.to(msg.socketId).emit('message', msg.data);
        }
    });

    socket.on('message', (message) => {
        // Forward message to the worker associated with this client
        workers[socket.id].send({ type: 'message', data: message, socketId: socket.id });
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        userSessions.delete(socket.id); // Remove the session
        console.log(`Number of connected clients: ${userSessions.size}`);
        // Inform the worker about the disconnection and terminate it
        workers[socket.id].send({ type: 'disconnect', socketId: socket.id });
        workers[socket.id].kill();
        delete workers[socket.id]; // Remove the worker from the map
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`);
});