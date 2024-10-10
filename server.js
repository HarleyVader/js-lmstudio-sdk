const express = require("express");
const path = require('path');
const fs = require("fs").promises;
const http = require("http");
const { Server } = require("socket.io");
const { Worker } = require("worker_threads");
const { LMStudioClient } = require("@lmstudio/sdk");
const readline = require("readline");
const cors = require('cors');
const axios = require("axios");

const { startMemory } = require('./memory');
const { startContinuity } = require('./continuity');
const { startEmotion } = require('./emotion');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 6969;

// Create a readline interface to read from the terminal
const rl = readline.createInterface({
  input: process.stdin, //standard terminal device input
  output: process.stdout, //standard terminal device output
});

// Increase the max listeners for the readline interface
rl.setMaxListeners(20);

const filteredWords = require("./fw.json");
function filter(message) {/*...*/}

async function sessionHistories(data, socketId) {/*...*/}

let roleplay;
// Load the model once
const client = new LMStudioClient({
  baseUrl: "ws://192.168.0.178/:1234", // Replace with your LMStudio server address
});

//TheBloke/SOLAR-10.7B-Instruct-v1.0-uncensored-GGUF/solar-10.7b-instruct-v1.0-uncensored.Q4_K_M.gguf
//TheBloke/SOLAR-10.7B-Instruct-v1.0-uncensored-GGUF/solar-10.7b-instruct-v1.0-uncensored.Q8_0.gguf
const modelConfig = {
  identifier:
    "TheBloke/SOLAR-10.7B-Instruct-v1.0-uncensored-GGUF/solar-10.7b-instruct-v1.0-uncensored.Q4_K_M.gguf",
  config: {
    gpuOffload: 0.2,
    context_length: 8192,
    embedding_length: 8192,
  },
};

async function loadModel() {/*...*/}

async function startServer() {
  startMemory(io);
  startContinuity(io);
  startEmotion(io);

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer().then(() => {
  console.log('Server started successfully');
}).catch(err => {
  console.error('Error starting server:', err);
});