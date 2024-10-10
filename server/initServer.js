import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

export function initServer() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server);
  return { app, server, io };
}