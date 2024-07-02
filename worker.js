const axios = require('axios');
const cheerio = require('cheerio');

let roleplayConfig;
let sessionHistories = {};
let userSessions = new Set();

process.on('message', (msg) => {
    if (msg.type === 'modelConfig') {
        // Receive model configuration from server
        roleplayConfig = msg.data;
    } else if (msg.type === 'message') {
        handleMessage(msg.data, msg.socketId);
    } else if (msg.type === 'disconnect') {
        handleDisconnect(msg.socketId);
    }
});

async function scrapeWebsite(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data, {
            xmlMode: true,
            decodeEntities: true
        });
        let paragraphs = [];
        
        $('p').each((i, elem) => {
            if (!$(elem).closest('a').length && !$(elem).find('a').length) {
                paragraphs.push($(elem).text().trim());
            }
        });
        
        // Filter out paragraphs that are too short or potentially contain code
        const cleanParagraphs = paragraphs.filter(p => {
            const words = p.split(/\s+/); // Split by whitespace to count words
            const isCodeSnippet = /<[^>]+>|function|var|let|const|document\.|window\.|\.css\(|\.html\(|\.append\(/.test(p);
            return words.length > 2 && !isCodeSnippet;
        });
        
        const finalData = cleanParagraphs.join('\n\n');
        return finalData;
    } catch (error) {
        console.error('Error scraping website:', error);
        return '';
    }
}

async function handleMessage(message, socketId) {
    if (!roleplayConfig) {
        console.error('Model configuration not received yet.');
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