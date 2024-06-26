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

const { LMStudioClient } = require('@lmstudio/sdk');
const client = new LMStudioClient({
    baseUrl: 'ws://192.168.0.178:1234',
});

client.llm.load('Orenguteng/Llama-3-8B-Lexi-Uncensored-GGUF/Lexi-Llama-3-8B-Uncensored_Q5_K_M.gguf', {
    config: {
        gpuOffload: 0.9,
        context_length: 8176,
        embedding_length: 8176,
    },
}).then(model => {
    console.log('Model loaded successfully');
    global.roleplay = model;
}).catch(error => {
    console.error('Error loading the model:', error);
});

let userSessions = new Set();

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    userSessions.add(socket.id);
    console.log(`Number of connected clients: ${userSessions.size}`);

    const worker = new Worker('./worker.js');

    worker.on('message', async (msg) => {
        if (msg.type === 'log') {
            console.log(msg.data);
        } else if (msg.type === 'response') {
            io.to(msg.socketId).emit('message', msg.data);
        } else if (msg.type === 'predict') {
            try {
                // Validate and transform the history array
                const validatedHistory = msg.data.history.map(item => {
                    // Assuming each item is an object with a 'content' property
                    // Check if 'content' exists and is a string; otherwise, return an empty string or handle appropriately
                    return typeof item.content === 'string' ? item.content : '';
                });
    
                // Await the promise to resolve and directly use the result
                const prediction = await global.roleplay.respond(validatedHistory, { temperature: 0.9 });
                // Assuming prediction is now a single value or object, directly send it
                worker.postMessage({ type: 'predictionResult', data: [prediction], requestId: msg.requestId });
            } catch (error) {
                console.error('Error during prediction:', error);
            }
        }
    });

    socket.on('message', (message) => {
        worker.postMessage({ type: 'message', data: message, socketId: socket.id });
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        userSessions.delete(socket.id);
        console.log(`Number of connected clients: ${userSessions.size}`);
        worker.postMessage({ type: 'disconnect', socketId: socket.id });
        worker.terminate();
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`);
});