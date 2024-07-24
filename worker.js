// worker.js
const { parentPort } = require('worker_threads');
const axios = require('axios');
const cheerio = require('cheerio');
const { LMStudioClient } = require('@lmstudio/sdk');

let roleplay;
let sessionHistories = {};

parentPort.on('message', async (msg) => {
    if (msg.type === 'collar') {
        handleCollar(msg.data.collar, msg.data.prompt, msg.socketId);
    } else if (msg.type === 'message') {
        handleMessage(msg.data, msg.socketId);
    } else if (msg.type === 'disconnect') {
        handleDisconnect(msg.socketId);
    } else if (msg.type === 'modelLoaded') {
        // Load the model within the worker
        const client = new LMStudioClient({
            baseUrl: 'ws://192.168.0.178:1234', // Use the same LMStudio server address
        });

        try {
            const model = await client.llm.get(msg.modelConfig.identifier, {
                config: msg.modelConfig.config
            });
            roleplay = model;
            console.log('Model loaded successfully in worker');
        } catch (error) {
            console.error('Error loading the model in worker:', error);
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

        const finalData = paragraphs.join('\n\n');
        return finalData; // Return the concatenated text content of all <p> elements
    } catch (error) {
        console.error('Error scraping website:', error);
        return '';
    }
}

async function handleCollar(collarText, userPrompt, socketId) {
    if (!roleplay) {
        console.error('Model not loaded yet.');
        return;
    }

    // Replace the system role with the provided collar text
    sessionHistories[socketId] = [
        { role: "system", content: collarText },
        { role: "user", content: userPrompt }
    ];

    // Process the user prompt as usual
    await handleMessage(userPrompt, socketId); // Added await here to ensure asynchronous execution
}

async function handleMessage(content, socketId) {
    // Initialize sessionHistories[socketId] as an array if it doesn't exist
    if (!sessionHistories[socketId]) {
        sessionHistories[socketId] = [];
    }

    let contentToProcess = content;
    if (content.startsWith('scrape:')) {
        const url = content.replace('scrape:', '').trim();
        const scrapedText = await scrapeWebsite(url);
        contentToProcess = scrapedText;
    }
    sessionHistories[socketId].push({ role: "user", content: contentToProcess });

    if (!roleplay) {
        console.error('Model not loaded yet.');
        return;
    }

    let history = sessionHistories[socketId];
    const prediction = roleplay.respond(history, {
        temperature: 0.9,
        max_tokens: 256,
    });

    try {
        for await (let text of prediction) {
            parentPort.postMessage({ type: 'response', data: text, socketId: socketId });
            sessionHistories[socketId].push({ role: "user", content: text });
        }
    } catch (error) {
        console.error('Error during prediction or sending response:', error);
    }
}

function handleDisconnect(socketId) {
    delete sessionHistories[socketId];
}