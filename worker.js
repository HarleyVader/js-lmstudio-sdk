const { parentPort } = require("worker_threads");
const fs = require('fs');
const path = require('path');
const axios = require('axios');

let sessionHistories = {}; // Initialize sessionHistories as an empty object
let triggers;
let collar;
let collarTriggers;

async function checkTriggers(triggers) {
    return triggers || '';
}

async function checkCollar() {
    if (!collar) {
        return new Promise((resolve, reject) => {
            fs.readFile(path.join(__dirname, 'role.json'), 'utf8', (err, data) => {
                if (err) {
                    console.error('Error reading role.json:', err);
                    reject(err);
                } else {
                    const roleData = JSON.parse(data);
                    collar = roleData.role;
                    resolve(collar);
                }
            });
        });
    } else {
        return collar;
    }
}

async function getSessionHistories(bambi, collarTriggers, socketId) {
    if (!sessionHistories[socketId]) {
        sessionHistories[socketId] = [];
    }

    if (sessionHistories[socketId].length === 0) {
        sessionHistories[socketId].push(
            { role: "system", content: collarTriggers },
            { role: "user", content: bambi }
        );
    }

    return sessionHistories[socketId];
}

async function saveSessionHistories(bambi, collarTriggers, finalContent, socketId) {
    if (!sessionHistories[socketId]) {
        sessionHistories[socketId] = [];
    }

    sessionHistories[socketId].push(
        { role: "system", content: collarTriggers },
        { role: "user", content: bambi },
        { role: "assistant", content: finalContent }
    );

    return sessionHistories[socketId];
}

async function handleMessage(messages, socketId) {
    try {
        collar = await checkCollar();
        triggers = await checkTriggers(messages.triggers);
        collarTriggers = collar + triggers;

        sessionHistories[socketId] = await getSessionHistories(messages.bambis, collarTriggers, socketId);

        const response = await axios.post('http://192.168.0.178:1234/v1/chat/completions', {
            model: "solar-10.7b-instruct-v1.0-uncensored",
            messages: sessionHistories[socketId],
            temperature: 0.3,
            max_tokens: 512,
            stream: true,
        }, {
            responseType: 'stream',
        });

        let responseData = '';
        let finalContent = '';

        response.data.on('data', (chunk) => {
            responseData += chunk.toString();

            const lines = responseData.split('\n');
            responseData = lines.pop();

            for (const line of lines) {
                if (line.trim() === 'data: [DONE]') {
                    continue;
                }

                if (line.startsWith('data: ')) {
                    const json = line.substring(6);
                    const parsed = JSON.parse(json);
                    if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                        finalContent += parsed.choices[0].delta.content;
                        handleResponse(parsed.choices[0].delta.content, socketId);
                    }
                }
            }
        });

        response.data.on('end', () => {
            parentPort.postMessage({ 'response': finalContent });
            saveSessionHistories(messages.bambis, collarTriggers, finalContent, socketId);
        });

    } catch (error) {
        console.error('Error handling message:', error);
        parentPort.postMessage({ 'log': `Error handling message: ${error}` });
    }
}

parentPort.on("message", async (msg) => {
    console.log(`Received message: ${JSON.stringify(msg)}`);
    if (msg.type === "triggers") {
        triggers = msg.triggers;
    } else if (msg.type === "messages") {
        parentPort.postMessage({ 'log': `Messages to worker: ${JSON.stringify(msg.data)}` });
        await handleMessage(msg.data, msg.socketId);
    } else if (msg.type === "disconnect") {
        handleDisconnect(msg.socketId);
    }
    parentPort.postMessage({ 'log': `Session Histories: ${JSON.stringify(sessionHistories)}` });
});

async function handleResponse(response, socketId) {
    parentPort.postMessage({
        type: "response",
        data: response,
        socketId: socketId,
    });
}

async function handleDisconnect(socketId) {
    if (sessionHistories[socketId]) {
        parentPort.postMessage({
            type: "messageHistory",
            data: sessionHistories[socketId],
            socketId: socketId,
        });
    }
}