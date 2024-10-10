import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import readline from 'readline';

const { startWebHost } = require('./webhost.js');
const { startMessageRouter } = require('./messageRouter.js');
const { startDatabase } = require('./database.js');
const domainName = require('os').hostname();



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
  const { app, server, io } = await startWebHost();
  startMessageRouter(app, io);
  startDatabase(io);
}

// Start the server
const getServerUrl = () => {
  const protocol = server instanceof require('https').server ? 'https' : 'http';
  return `${protocol}://${domainName}:${PORT}`;
};

const serverUrl = getServerUrl();
console.log(`Server URL: ${serverUrl}`);

server.listen(PORT, serverUrl, () => {
  console.log(`Listening on ${serverUrl}:${PORT}`);
});


startServer().then(() => {
  console.log('Server started successfully');
}).catch(err => {
  console.error('Error starting server:', err);
});