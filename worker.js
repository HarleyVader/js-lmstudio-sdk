const { parentPort, workerData } = require('worker_threads');
const { LMStudioClient } = require('@lmstudio/sdk');
const axios = require('axios'); // Ensure axios is installed for HTTP requests
const cheerio = require('cheerio'); // Ensure cheerio is installed for HTML parsing

// Initialize the LMStudio SDK with the client passed from the main thread
const client = new LMStudioClient(workerData.client.config);

// Function to scrape URLs
async function scrapeURL(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const texts = [];
        $('h1, h2, h3, p').each((i, elem) => {
            texts.push($(elem).text());
        });
        return texts.join(', ');
    } catch (error) {
        return `Error scraping URL: ${error.message}`;
    }
}

// Function to handle the interaction with the LMStudio model
async function handleInteraction(message) {
    try {
        if (message.startsWith('scrape: ')) {
            // Extract URL from the message
            const url = message.replace('scrape: ', '').trim();
            // Scrape the URL
            const scrapeResult = await scrapeURL(url);
            // Send the scrape result back to the main thread
            parentPort.postMessage(scrapeResult);
        } else {
            // Assuming 'message' contains the input from the user
            // and 'client' is properly initialized and configured to interact with the model
            const response = await client.llm.generate({
                prompt: message,
                maxTokens: 150,
                temperature: 0.7,
                topP: 1,
                frequencyPenalty: 0,
                presencePenalty: 0,
            });

            // Send the generated response back to the main thread
            parentPort.postMessage(response);
        }
    } catch (error) {
        // In case of an error, send the error message back to the main thread
        parentPort.postMessage(`Error generating response: ${error.message}`);
    }
}

// Listen for messages from the main thread
parentPort.on('message', (message) => {
    // Call the function to handle the interaction with the received message
    handleInteraction(message);
});