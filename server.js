// Import necessary libraries
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const { Server } = require("socket.io");
const { fork } = require('child_process');

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

// Load the model
client.llm.load('Orenguteng/Llama-3-8B-Lexi-Uncensored-GGUF/Lexi-Llama-3-8B-Uncensored_Q5_K_M.gguf', {
    config: {
        gpuOffload: 0.9,
        context_length: 8176,
        embedding_length: 8176,
    },
}).then(model => {
    roleplay = model;
}).catch(error => {
    console.error('Error loading the model:', error);
    process.send({ type: 'log', data: 'Error loading the model' });
});

let userSessions = new Map(); // Use a Map to track unique user sessions and their corresponding worker

// Handle connection
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    // Fork a new worker process for each connected client
    const worker = fork('./worker.js');
    userSessions.set(socket.id, worker); // Map the socket.id to the worker

    console.log(`Number of connected clients: ${userSessions.size}`);

    socket.on('message', (message) => {
        // Forward message to the corresponding worker
        const worker = userSessions.get(socket.id);
        if (worker) {
            worker.send({ type: 'message', data: message, socketId: socket.id });
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        // Inform the corresponding worker about the disconnection
        const worker = userSessions.get(socket.id);
        if (worker) {
            worker.send({ type: 'disconnect', socketId: socket.id });
            worker.kill(); // Terminate the worker process
        }
        userSessions.delete(socket.id); // Remove the session
        console.log(`Number of connected clients: ${userSessions.size}`);
    });
});

// Handle messages from any worker and forward them to the appropriate client
userSessions.forEach((worker, socketId) => {
    worker.on('message', (msg) => {
        if (msg.type === 'log') {
            console.log(msg.data); // Log worker messages
        } else if (msg.type === 'response') {
            io.to(msg.socketId).emit('message', msg.data);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`);
});