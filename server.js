//server.js
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

// Fork the worker process
const worker = fork('./worker.js');

let userSessions = new Set(); // Use a Set to track unique user sessions

// Handle connection
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    userSessions.add(socket.id); // Add the new session
    console.log(`Number of connected clients: ${userSessions.size}`);

    socket.on('message', (message) => {
        // Forward message to worker
        worker.send({ type: 'message', data: message, socketId: socket.id });
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        userSessions.delete(socket.id); // Remove the session
        console.log(`Number of connected clients: ${userSessions.size}`);
        // Inform worker about the disconnection
        worker.send({ type: 'disconnect', socketId: socket.id });
    });
});

// Receive messages from worker and forward them to the appropriate client
worker.on('message', (msg) => {
    if (msg.type === 'log') {
        console.log(msg.data); // Log worker messages
    } else if (msg.type === 'response') {
        io.to(msg.socketId).emit('message', msg.data);
    }
});

server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`);
});