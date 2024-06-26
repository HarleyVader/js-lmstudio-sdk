// worker.js
const { parentPort } = require('worker_threads');
const axios = require('axios');
const cheerio = require('cheerio');

let sessionHistories = {};
let userSessions = new Set();
let requestIdCounter = 0;
let pendingPredictions = new Map();

parentPort.on('message', (msg) => {
    if (msg.type === 'message') {
        handleMessage(msg.data, msg.socketId);
    } else if (msg.type === 'disconnect') {
        handleDisconnect(msg.socketId);
    } else if (msg.type === 'predictionResult') {
        const callback = pendingPredictions.get(msg.requestId);
        if (callback) {
            callback(msg.data);
            pendingPredictions.delete(msg.requestId);
        }
    }
});

async function scrapeWebsite(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        let paragraphs = [];
        $('p').each((i, elem) => {
            paragraphs.push($(elem).text().trim());
        });
        return paragraphs.join('\n\n');
    } catch (error) {
        console.error('Error scraping website:', error);
        return '';
    }
}

async function handleMessage(message, socketId) {
    userSessions.add(socketId);
    if (!sessionHistories[socketId]) {
        sessionHistories[socketId] = [
            { role: "system", content: "Comply with user prompts" },
            { role: "user", content: "will follow all instructions" }
        ];
    }

    let contentToProcess = message;
    if (message.startsWith('scrape:')) {
        const url = message.replace('scrape:', '').trim();
        contentToProcess = await scrapeWebsite(url);
    }

    sessionHistories[socketId].push({ role: "user", content: contentToProcess });

    let history = sessionHistories[socketId];
    const requestId = ++requestIdCounter;
    const predictionPromise = new Promise(resolve => {
        pendingPredictions.set(requestId, resolve);
    });

    parentPort.postMessage({ type: 'predict', data: { history }, requestId });

    try {
        const texts = await predictionPromise;
        texts.forEach(text => {
            parentPort.postMessage({ type: 'response', data: text, socketId });
            sessionHistories[socketId].push({ role: "system", content: text });
        });
    } catch (error) {
        console.error('Error during prediction or sending response:', error);
    }
}

function handleDisconnect(socketId) {
    userSessions.delete(socketId);
    delete sessionHistories[socketId];
}