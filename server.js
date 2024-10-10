import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import readline from 'readline';
import { startMemory } from './server/js/memory';
import { startContinuity } from './server/js/continuity';
import { startEmotion } from './server/js/emotion';

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = 6969;

// Create a readline interface to read from the terminal
const rl = readline.createInterface({
  input: process.stdin, // standard terminal device input
  output: process.stdout, // standard terminal device output
});

// Increase the max listeners for the readline interface
rl.setMaxListeners(20);

async function startServer() {
  startMemory(io);
  startContinuity(io);
  startEmotion(io);

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Server is running on 127.0.0.1:${PORT}`);
  });
}

startServer().then(() => {
  console.log('Server started successfully');
}).catch(err => {
  console.error('Error starting server:', err);
});