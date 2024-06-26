const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");
const { Worker } = require('worker_threads');
const { LMStudioClient } = require('@lmstudio/sdk');
const fs = require('fs').promises; // Added missing fs import for reading directory files

// Initialize the LMStudio SDK
const client = new LMStudioClient({
    baseUrl: 'ws://192.168.0.178:1234', // Replace with your LMStudio server address
});

let roleplay;

async function loadModel() {
    if (!roleplay) {
        try {
            roleplay = await client.llm.load('Orenguteng/Llama-3-8B-Lexi-Uncensored-GGUF/Lexi-Llama-3-8B-Uncensored_Q5_K_M.gguf', {
                config: {
                    gpuOffload: 0.9,
                    context_length: 8176,
                    embedding_length: 8176,
                },
            });
        } catch (error) {
            console.error('Error loading the model:', error);
        }
    }
}

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 6969;

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

let userSessions = new Map(); // Use Map to keep track of user sessions and workers

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    const worker = new Worker('./worker.js', { workerData: { modelDetails: 'ws://192.168.0.178:1234' } });
    userSessions.set(socket.id, worker); // Store worker reference in userSessions

    console.log(`Number of clients connected: ${userSessions.size}`); // Log the number of connected clients

    worker.on('message', (msg) => {
        if (msg.type === 'response') {
            io.to(msg.socketId).emit('message', msg.data);
        }
    });

    socket.on('message', (message) => {
        worker.postMessage({ type: 'message', data: message, socketId: socket.id });
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        const worker = userSessions.get(socket.id);
        if (worker) {
            worker.postMessage({ type: 'disconnect', socketId: socket.id });
            worker.terminate();
            userSessions.delete(socket.id);
        }
        console.log(`Number of clients connected: ${userSessions.size}`); // Log the number of connected clients after disconnection
    });
});

loadModel().then(() => {
    server.listen(PORT, () => console.log(`Server listening on port:${PORT}`));
});