const { parentPort, workerData } = require('worker_threads');
const axios = require('axios');
const cheerio = require('cheerio');

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
            // Send request to server for handling LMStudioClient operations
            const serverResponse = await axios.post('YOUR_SERVER_ENDPOINT', { message });
            if (serverResponse.data) {
                result = serverResponse.data;
            } else {
                result = { success: false, error: "Unexpected response format from server" };
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