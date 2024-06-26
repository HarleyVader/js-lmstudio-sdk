// server.js
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const { Server } = require("socket.io");
const { Worker } = require('worker_threads');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 6969;

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

// Initialize the LMStudio SDK
const { LMStudioClient } = require('@lmstudio/sdk');
const client = new LMStudioClient({
    baseUrl: 'ws://192.168.0.178:1234', // Replace with your LMStudio server address
});

// Load the model globally in the server
client.llm.load('Orenguteng/Llama-3-8B-Lexi-Uncensored-GGUF/Lexi-Llama-3-8B-Uncensored_Q5_K_M.gguf', {
    config: {
        gpuOffload: 0.9,
        context_length: 8176,
        embedding_length: 8176,
    },
}).then(model => {
    console.log('Model loaded successfully');
    global.roleplay = model; // Make the model globally available
}).catch(error => {
    console.error('Error loading the model:', error);
});

let userSessions = new Set(); // Use a Set to track unique user sessions

// Handle connection
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    userSessions.add(socket.id); // Add the new session
    console.log(`Number of connected clients: ${userSessions.size}`);

    const worker = new Worker('./worker.js');

    worker.on('message', (msg) => {
        if (msg.type === 'log') {
            console.log(msg.data); // Log worker messages
        } else if (msg.type === 'response') {
            io.to(msg.socketId).emit('message', msg.data);
        }
    });

    socket.on('message', (message) => {
        // Forward message to worker
        worker.postMessage({ type: 'message', data: message, socketId: socket.id, roleplay: global.roleplay });
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        userSessions.delete(socket.id); // Remove the session
        console.log(`Number of connected clients: ${userSessions.size}`);
        // Inform worker about the disconnection
        worker.postMessage({ type: 'disconnect', socketId: socket.id });
        worker.terminate(); // Terminate the worker when the client disconnects
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`);
});