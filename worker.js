const { parentPort } = require('worker_threads');
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

// Function to load the model
async function loadModel() {
    if (!roleplay) {
        try {
            const model = await client.llm.load('Orenguteng/Llama-3-8B-Lexi-Uncensored-GGUF/Lexi-Llama-3-8B-Uncensored_Q5_K_M.gguf', {
                config: {
                    gpuOffload: 0.9,
                    context_length: 8176,
                    embedding_length: 8176,
                },
            });
            roleplay = model;
        } catch (error) {
            console.error('Error loading the model:', error);
            parentPort.postMessage({ type: 'log', data: 'Error loading the model' });
        }
    }
}

// Load the model initially
loadModel();

parentPort.on('message', (msg) => {
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

async function handleMessage(message, socketId) {
    // Ensure the model is loaded before proceeding
    await loadModel();

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
            parentPort.postMessage({ type: 'response', data: text, socketId: socketId });
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