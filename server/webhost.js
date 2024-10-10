const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require('path');
const cors = require('cors');
const fs = require("fs").promises;

async function startWebHost() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

  const PORT = 6969;

  // Serve static files from the 'public' directory
  app.use(cors());
  app.use(express.static(path.join(__dirname, "public")));

  // Handle HTTP requests
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

  app.use("/images", express.static(path.join(__dirname, "images")));

  app.get("/images", async (req, res) => {
    const directoryPath = path.join(__dirname, "images");
    const files = await fs.readdir(directoryPath);
    let html = "<html><body>";
    files.forEach((file) => {
      if (
        file.endsWith(".png") ||
        file.endsWith(".jpg") ||
        file.endsWith(".jpeg")
      ) {
        html += `<img src="/images/${file}" width="64" height="64" />`;
      }
    });
    html += "</body></html>";
    res.send(html);
  });

  app.get("/help", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "help.html"));
  });

  app.get("/psychodelic-trigger-mania", (req, res) => {
    res.sendFile(
      path.join(__dirname, "public", "psychodelic-trigger-mania.html")
    );
  });

  // Start the server
  server.listen(PORT, () => {
    console.log(`WebHost listening on *:${PORT}`);
  });

  return { app, server, io };
}

module.exports = { startWebHost };