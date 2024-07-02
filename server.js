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

// Map to track connected users
const userConnections = new Map();

// Socket.IO setup for handling client interactions
io.on('connection', (socket) => {
    console.log(`A user connected with id: ${socket.id}`);
    // Add the user to the map
    userConnections.set(socket.id, { /* additional info can be stored here */ });

    // Log the amount of connected users
    console.log(`Total connected users: ${userConnections.size}`);

socket.on('message', (msg) => {
            console.log('Message from client:', msg);
            // Pass only necessary data to the worker
            const worker = new Worker('./worker.js', {
                workerData: {
                    message: msg,
                    clientConfig: client.config // Assuming client.config contains the necessary configuration
                }
            });

        worker.on('message', (result) => {
            console.log('Message from worker:', result);
            // Emit the result back to the client
            socket.emit('message', result);
        });

        worker.on('error', (error) => {
            console.error('Worker error:', error);
            socket.emit('message', 'Error processing your request');
        });

        worker.on('exit', (code) => {
            if (code !== 0)
                console.error(`Worker stopped with exit code ${code}`);
        });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected with id: ${socket.id}`);
        // Remove the user from the map
        userConnections.delete(socket.id);

        // Log the updated amount of connected users
        console.log(`Total connected users: ${userConnections.size}`);
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`);
});