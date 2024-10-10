const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require('path');
const cors = require('cors');

async function startWebHost() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

  const PORT = 6969;

  // Serve static files from the 'public' directory
  app.use(cors());
  app.use(express.static(path.join(__dirname, "public")));

  // Start the server
  server.listen(PORT, () => {
    console.log(`WebHost listening on *:${PORT}`);
  });

  return { app, server, io };
}

module.exports = { startWebHost };