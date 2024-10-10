import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import cors from 'cors';
import fs from 'fs/promises';

export async function startWebHost() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

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

  app.use("/api/tts", (req, res) => {
    const { text } = req.query;
    axios.get(`http://0.0.0.0:5002/api/tts?text=${text}`, { responseType: 'arraybuffer' })
      .then((response) => {
        res.setHeader("Content-Type", "audio/wav");
        res.setHeader("Content-Length", response.data.length);
        res.send(response.data);
      })
      .catch((error) => {
        console.error("Error fetching TTS audio:", error);
        res.status(500).send("Error fetching TTS audio");
      });
  });

  return { app, server, io };
}