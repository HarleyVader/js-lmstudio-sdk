const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const { Server } = require("socket.io");
const { Worker } = require('worker_threads');
const { LMStudioClient } = require('@lmstudio/sdk');

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

// Use a Map to keep track of workers for each client
let clientWorkers = new Map();

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    // Spawn a new worker for each client
    const worker = new Worker('./worker.js');
    clientWorkers.set(socket.id, worker);

    console.log(`Number of connected clients: ${clientWorkers.size}`);

    socket.on('message', (message) => {
        const worker = clientWorkers.get(socket.id);
        if (worker) {
            worker.postMessage({ type: 'message', data: message, socketId: socket.id });
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        const worker = clientWorkers.get(socket.id);
        if (worker) {
            worker.postMessage({ type: 'disconnect', socketId: socket.id });
            worker.terminate();
        }
        clientWorkers.delete(socket.id);
        console.log(`Number of connected clients: ${clientWorkers.size}`);
    });
});

clientWorkers.forEach((worker, clientId) => {
    worker.on('message', (msg) => {
        if (msg.type === 'log') {
            console.log(msg.data);
        } else if (msg.type === 'response') {
            io.to(msg.socketId).emit('message', msg.data);
        }
    });
});

// Load LLM in the main server and notify workers
const client = new LMStudioClient({
    baseUrl: 'ws://192.168.0.178:1234',
});

client.llm.load('TheBloke/SOLAR-10.7B-Instruct-v1.0-uncensored-GGUF/solar-10.7b-instruct-v1.0-uncensored.Q4_K_S.gguf', {
    //signal: controller.signal,
    config: {
        gpuOffload: 0.9,
        context_length: 8176,
        embedding_length: 8176,
    },
}).then(model => {
    // Notify all workers that the model is loaded
    clientWorkers.forEach(worker => {
        worker.postMessage({ type: 'modelReady' });
    });
}).catch(error => {
    console.error('Error loading the model:', error);
    // Notify all workers about the error
    clientWorkers.forEach(worker => {
        worker.postMessage({ type: 'modelError', data: 'Error loading the model' });
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`);
});