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

// Serve help.html from the 'public' directory
app.get('/help', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'help.html'));
});

let userSessions = new Set(); // Use a Set to track unique user sessions
let workers = new Map(); // Map to store workers based on socket.id

const filteredWords = require('./fw.json');
const { log } = require('console');

function filter(message) {
    return message.split(' ').map(word => {
        return filteredWords.includes(word.toLowerCase()) ? ' ' : word;
    }).join(' ');
}

const client = new LMStudioClient({
    baseUrl: 'ws://192.168.0.178:1234', // Replace with your LMStudio server address
});

let modelConfig = null;

// Load the model once
client.llm.load('TheBloke/SOLAR-10.7B-Instruct-v1.0-uncensored-GGUF/solar-10.7b-instruct-v1.0-uncensored.Q4_K_S.gguf', {
    config: {
        gpuOffload: 0.0,
        context_length: 8192,
        embedding_length: 512,
    },
}).then(model => {
    modelConfig = {
        identifier: 'TheBloke/SOLAR-10.7B-Instruct-v1.0-uncensored-GGUF/solar-10.7b-instruct-v1.0-uncensored.Q4_K_S.gguf',
        config: {
            gpuOffload: 0.0,
            context_length: 8192,
            embedding_length: 256,
        }
    };
    console.log('Model loaded successfully');
}).catch(error => {
    console.error('Error loading the model:', error);
});

// Handle connection
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    userSessions.add(socket.id); // Add the new session
    console.log(`Number of connected clients: ${userSessions.size}`);

    // Create a new worker for this client
    const text2text = new Worker('./workers/text2text.js');
    const speech2text = new Worker('./workers/speech2text.js');
    workers.set(socket.id, text2text);
    workers.set(socket.id, speech2text);

    // Pass the model configuration to the worker
    if (modelConfig) {
        text2text.postMessage({
            type: 'modelLoaded',
            modelConfig: modelConfig
        });
    } else {
        console.error('Model configuration is not available');
    }

    socket.on('message', (message) => {
        console.log(`Message from ${socket.id}: ${message}`);
        const filteredMessage = filter(message);
        console.log(`Filtered message: ${filteredMessage}`);
        worker.postMessage({ type: 'message', data: filteredMessage, socketId: socket.id });
    });

    socket.on('speech2text', (filename) => {
        log(`Speech2Text from ${socket.id}: ${filename}`);
        console.log(`Speech2Text from ${socket.id}: ${filename}`);
        worker.postMessage({ type: 'speech2text', filename: filename, socketId: socket.id });
    });


    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        userSessions.delete(socket.id); // Remove the session
        console.log(`Number of connected clients: ${userSessions.size}`);
        // Inform worker about the disconnection
        worker.postMessage({ type: 'disconnect', socketId: socket.id });
        // Terminate the worker and remove it from the map
        worker.terminate();
        workers.delete(socket.id);
    });

    // Receive messages from worker and forward them to the appropriate client
    worker.on('message', (msg) => {
        if (msg.type === 'log') {
            console.log(msg.data); // Log worker messages
        } else if (msg.type === 'response') {
            io.to(msg.socketId).emit('message', msg.data);
        } else if (msg.type === 'speech2text') {
            io.to(msg.socketId).emit('speech2text', msg.data);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`);
});

/*
const { MongoClient } = require('mongodb');
const uri = "mongodb://localhost:27017"; // Replace with your MongoDB connection string
const clientDB = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

clientDB.connect(err => {
    if (err) {
        console.error('Error connecting to MongoDB:', err);
        return;
    }
    console.log('Connected to MongoDB');
    const db = clientDB.db('chatDB');
    const messagesCollection = db.collection('messages');

    // Save client message and LLM replies
    io.on('connection', (socket) => {
        socket.on('message', async (prompt) => {
            const timestamp = new Date();
            const message = {
                socketId: socket.id,
                timestamp: timestamp,
                prompt: prompt,
                reply: null
            };

            try {
                // Save the client message
                await messagesCollection.insertOne(message);
                console.log('Client message saved to MongoDB');

                // Generate reply from LLM
                const reply = await client.llm.generate(prompt);
                message.reply = reply;

                // Save the reply
                await messagesCollection.updateOne(
                    { _id: message._id },
                    { $set: { reply: reply } }
                );
                console.log('LLM reply saved to MongoDB');

                // Send the reply back to the client
                socket.emit('message', reply);
            } catch (error) {
                console.error('Error saving message or generating reply:', error);
            }
        });
    });
});
*/