const { LMStudioClient } = require('@lmstudio/sdk');
const axios = require('axios');
const cheerio = require('cheerio');

// Initialize the LMStudio SDK
const client = new LMStudioClient({
    baseUrl: 'ws://192.168.0.178:1234', // Replace with your LMStudio server address
});

let roleplay;
let sessionHistories = {};
let userSessions = new Set();

// Load the model
client.llm.load('mradermacher/Berghof-NSFW-7B-i1-GGUF/Berghof-NSFW-7B.i1-IQ3_XS.gguf', {
    config: {
        gpuOffload: 0.9,
        context_length: 8176,
        embedding_length: 8176,
    },
}).then(model => {
    roleplay = model;
}).catch(error => {
    console.error('Error loading the model:', error);
    process.send({ type: 'log', data: 'Error loading the model' });
});

process.on('message', (msg) => {
    if (msg.type === 'message') {
        handleMessage(msg.data, msg.socketId);
    } else if (msg.type === 'disconnect') {
        handleDisconnect(msg.socketId);
    }
});

async function scrapeWebsite(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        let textContent = '';
        $('body *').each(function() {
            if ($(this).children().length === 0) { // Node with no child elements
                textContent += ' ' + $(this).text();
            }
        });
        return textContent.trim();
    } catch (error) {
        console.error('Error scraping website:', error.toString());
        throw new Error('Failed to scrape website');
    }
}

async function handleMessage(message, socketId) {
    if (!roleplay) {
        console.error('Model not loaded yet.');
        return;
    }

    userSessions.add(socketId);
    if (!sessionHistories[socketId]) {
        sessionHistories[socketId] = [];
    }

    let contentToProcess = message;
    if (message.startsWith('scrape:')) {
        const url = message.replace('scrape:', '').trim();
        try {
            const scrapedText = await scrapeWebsite(url);
            contentToProcess = scrapedText;
        } catch (error) {
            console.error('Error processing scrape request:', error.message);
            // Optionally, send an error message back to the client
            process.send({ type: 'error', data: 'Failed to scrape website.', socketId: socketId });
            return; // Stop further execution for this message
        }
    }

    // At this point, sessionHistories[socketId] is guaranteed to be defined
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
        // Optionally, send an error message back to the client
        process.send({ type: 'error', data: 'Prediction or response failed.', socketId: socketId });
    }
}

function handleDisconnect(socketId) {
    userSessions.delete(socketId);
    delete sessionHistories[socketId];
}