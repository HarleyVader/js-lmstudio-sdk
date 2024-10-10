import { Server } from 'socket.io';
import { ClientMessage, LLMMessage } from './message.js';
import { Message } from '../models.js';
import { Worker } from 'worker_threads';

const filteredWords = require("../fw.json");

function filter(message) {
    if (typeof message !== "string") {
        message = String(message);
    }
    return message
        .split(" ")
        .map((word) => {
            return filteredWords.includes(word.toLowerCase()) ? " " : word;
        })
        .join(" ");
}

export function startSocketRouter(server) {
    const io = new Server(server);
    let userSessions = new Set();
    let workers = new Map();
    let socketStore = new Map(); // Shared context for socket objects

    io.on("connection", (socket) => {
        userSessions.add(socket.id);
        console.log(`Client connected: ${socket.id} clients: ${userSessions.size}`);

        // Create a new worker for this client
        const worker = new Worker("./worker.js");
        workers.set(socket.id, worker);

        // Store the socket object in the shared context
        socketStore.set(socket.id, socket);

        socket.on("message", async (data) => {
            const clientMessage = ClientMessage.fromSocketData(data);
            console.log(`Message from ${clientMessage.socketId}: ${clientMessage.message}`);

            const filteredMessage = filter(clientMessage.message);
            console.log(`Filtered message: ${filteredMessage}`);

            const userMessage = new Message({
                socketId: clientMessage.socketId,
                sender: 'user',
                message: filteredMessage
            });

            try {
                await userMessage.save();
                console.log('Client message saved to MongoDB');
            } catch (error) {
                console.error('Error saving client message:', error);
            }

            worker.postMessage({
                type: "message",
                data: filteredMessage,
                triggers: "",
                socketId: clientMessage.socketId,
            });
        });

        socket.on("triggers", (triggers) => {
            worker.postMessage({ type: "triggers", triggers });
        });

        socket.on("disconnect", async () => {
            worker.postMessage({ type: "disconnect", socketId: socket.id });
            terminator(socket.id);
        });

        function terminator(socketId) {
            userSessions.delete(socketId);
            worker.terminate();
            workers.delete(socketId);
            console.log(
                `Client disconnected: ${socketId} clients: ${userSessions.size}`
            );
        }

        worker.on("message", async (msg) => {
            const llmMessage = new Message({
                socketId: msg.socketId,
                timestamp: new Date(),
                sender: 'LLM',
                message: msg.data
            });

            try {
                await llmMessage.save();
                console.log('LLM message saved to MongoDB');
            } catch (error) {
                console.error('Error saving LLM message:', error);
            }

            if (msg.type === "log") {
                console.log(msg.data, msg.socketId);
            } else if (msg.type === "response") {
                io.to(msg.socketId).emit("response", msg.data);
            } else if (msg.type === "messageHistory") {
                sessionHistories(msg.data, msg.socketId);
                terminator(msg.socketId);
            } else if (msg.type === "triggers") {
                io.to(msg.socketId).emit("triggers", msg.data);
            } else {
                console.error("Unknown message type:", msg.type);
            }
        });
    });

    return io;
}
