const { parentPort, workerData } = require('worker_threads');
const { LMStudioClient } = require('@lmstudio/sdk');
const axios = require('axios');
const cheerio = require('cheerio');

// Ensure the LMStudioClient is initialized with the correct configuration
const client = new LMStudioClient(workerData.clientConfig);

async function scrapeURL(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const texts = [];
        $('h1, h2, h3, p').each((i, elem) => {
            texts.push($(elem).text());
        });
        return { success: true, data: texts.join(', ') };
    } catch (error) {
        return { success: false, error: `Error scraping URL: ${error.message}` };
    }
}

async function handleInteraction(message) {
    try {
        let result;
        if (message.startsWith('scrape: ')) {
            const url = message.replace('scrape: ', '').trim();
            result = await scrapeURL(url);
        } else {
            // Use the SDK according to the documentation for generating responses
            const response = await client.llm.generate({
                prompt: message,
                maxTokens: 150,
                temperature: 0.7,
                topP: 1,
                frequencyPenalty: 0,
                presencePenalty: 0,
            });

            if (response && response.data) {
                result = { success: true, data: response.data.choices[0].text.trim() }; // Adjusted according to SDK response structure
            } else {
                result = { success: false, error: "Unexpected response format from LMStudioClient" };
            }
        }
        // Ensure result is serializable
        const serializableResult = JSON.parse(JSON.stringify(result));
        parentPort.postMessage(serializableResult);
    } catch (error) {
        // Improved error serialization
        const errorResponse = {
            success: false,
            error: `Error generating response: ${error.message}`,
            stack: error.stack // Consider removing for production to avoid leaking sensitive info
        };
        console.error("Error in handleInteraction:", errorResponse);
        parentPort.postMessage(errorResponse);
    }
}

parentPort.on('message', (message) => {
    handleInteraction(message);
});