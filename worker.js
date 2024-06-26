// worker.js
const axios = require('axios');
const cheerio = require('cheerio');

let roleplay;
let sessionHistories = {};
let userSessions = new Set();

process.on('message', async (msg) => {
    if (msg.type === 'message') {
        handleMessage(msg.data, msg.socketId, msg.model);
    } else if (msg.type === 'disconnect') {
        handleDisconnect(msg.socketId);
    }
});

async function scrapeWebsite(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        let texts = [];
        $('p').each((i, elem) => {
            let text = $(elem).text().trim();
            if (text) {
                texts.push(text.replace(/\s{2,}/g, ' '));
            }
        });
        return texts.join(' ');
    } catch (error) {
        console.error('Error scraping website:', error);
        return '';
    }
}

async function handleMessage(message, socketId, model) {
    roleplay = model; // Assign the model passed from the server
    if (!roleplay) {
        console.error('Model not loaded yet.');
        return;
    }

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
    const prediction = roleplay.respond(history, {
        temperature: 0.9,
    });

    try {
        for await (let text of prediction) {
            process.send({ type: 'response', data: text, socketId: socketId });
            sessionHistories[socketId].push({ role: "system", content: text });
        }
    } catch (error) {
        console.error('Error during prediction or sending response:', error);
    }
}

function handleDisconnect(socketId) {
    userSessions.delete(socketId);
    delete sessionHistories[socketId];
}