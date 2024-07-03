const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const { Server } = require("socket.io");
const { Worker } = require('worker_threads');
const { LMStudioClient } = require('@lmstudio/sdk');

const io = require('socket.io')(server);
const app = express();
const server = http.createServer(app);


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
const client = new LMStudioClient({
    baseUrl: 'ws://192.168.0.178:1234', // Replace with your LMStudio server address
});

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


io.on('connection', (socket) => {
    console.log('Client connected');
    

    // Spawn a worker thread on client connect
    const worker = new Worker('./worker.js');

    // Handle client messages
    socket.on('message', (message) => {
        // Send the message to the worker thread
        worker.postMessage(message);
    });

    // Receive reply from the worker thread
    worker.on('message', (reply) => {
        // Send the reply to the client
        socket.emit('reply', reply);
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected');
        // Terminate the worker thread
        worker.terminate();
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`);
});