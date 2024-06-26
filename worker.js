const { parentPort, workerData } = require('worker_threads');
const axios = require('axios');
const cheerio = require('cheerio');

let sessionHistories = {};
let userSessions = new Set();

parentPort.on('message', async (msg) => {
    if (msg.type === 'message') {
        await handleMessage(msg.data, msg.socketId);
    } else if (msg.type === 'disconnect') {
        handleDisconnect(msg.socketId);
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
    // Simulate a response for demonstration purposes
    let response = `Processed: ${contentToProcess}`;
    parentPort.postMessage({ type: 'response', data: response, socketId: socketId });
    sessionHistories[socketId].push({ role: "system", content: response });
}

function handleDisconnect(socketId) {
    userSessions.delete(socketId);
    delete sessionHistories[socketId];
}