//worker.js
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
client.llm.load('Orenguteng/Llama-3-8B-Lexi-Uncensored-GGUF/Lexi-Llama-3-8B-Uncensored_Q5_K_M.gguf', {
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
        const $ = cheerio.load(data, {
            xmlMode: true, // Treats the input as XML; however, it's primarily for ignoring scripts and styles
            decodeEntities: true // Ensures special characters are decoded
        });
        let paragraphs = [];
        
        $('p').each((i, elem) => {
            // Using .text() with cheerio already ignores HTML tags, returning only the text content
            paragraphs.push($(elem).text().trim());
        });
        
        // Filter out any potential script or style content mistakenly picked up
        const cleanParagraphs = paragraphs.filter(p => !p.match(/<script>|<style>/gi));
        
        const finalData = cleanParagraphs.join('\n\n');
        return finalData; // Return the concatenated text content of all <p> elements, ignoring scripts, styles, and HTML tags
    } catch (error) {
        console.error('Error scraping website:', error);
        return '';
    }
}
async function handleMessage(message, socketId) {
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
        const scrapedText = await scrapeWebsite(url);
        contentToProcess = scrapedText;
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