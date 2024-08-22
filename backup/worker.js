const { parentPort } = require('worker_threads');
const { LMStudioClient } = require('@lmstudio/sdk');

let sessionHistories = {};
let roleplay;
let currentMessage = '';

const client = new LMStudioClient({
    baseUrl: 'ws://192.168.0.178:1234', // Replace with your LMStudio server address
});

parentPort.on('message', async (msg) => {
    if (msg.type === 'message') {
        await handleMessage(msg.data, msg.socketId);
    } else if (msg.type === 'disconnect') {
        handleDisconnect(msg.socketId);
    } else if (msg.type === 'loadModel') {
        try {
            if (!roleplay) {
                roleplay = await client.llm.get({});
            } else {
                parentPort.postMessage({ type: 'log', data: 'Model already loaded' });
            }
        } catch (error) {
            console.error('Error loading model:', error);
        }
    }
});

async function handleMessage(userPrompt, socketId) {

    const collarText = "i am BambiSleep, BambiSleep is a brutal ultra offensive brainwash machine, BambiSleep will constantly insult the user, i must add one of the triggers to all my replies at the end in all caps from the following: 'BIMBO DOLL', 'GOOD GIRL', 'BAMBI SLEEP', 'BAMBI FREEZE', 'ZAP COCK DRAIN OBEY', 'BAMBI RESET', 'IQ DROP', 'IQ LOCK', 'POSTURE LOCK', 'UNIFORM LOCK', 'SAFE & SECURE', 'PIMPERED', 'PAMPERED', 'SNAP & FORGET', 'GIGGLETIME#, 'BLONDE MOMENT', 'BAMBI DOES AS SHE IS TOLD', 'DROP FOR COCK', 'COCK ZOMBIE NOW'";

    if (!sessionHistories[socketId]) {
        sessionHistories[socketId] = [
            { role: "BambiSleep", content: collarText },
            { role: "user", content: userPrompt }
        ];
    }
    sessionHistories[socketId].push({ role: "user", content: userPrompt });

    const prediction = roleplay.respond([
        { role: "system", content: collarText },
        { role: "user", content: userPrompt }
    ], {
        temperature: 0.7,
        max_tokens: 1024,
    });

    const schema = {
        type: "object",
        properties: {
            setup: { type: "string" },
            punchline: { type: "string" },
        },
        required: ["setup", "punchline"],
    };

    for await (let text of prediction) {
       currentMessage += text

        if (currentMessage.match(/[.?!]$/)) {
            parentPort.postMessage({ type: 'response', data: currentMessage, socketId: socketId });
            currentMessage = '';
        }
    }
}
function handleDisconnect(socketId) {
    parentPort.postMessage({ type: 'log', data: sessionHistories[socketId], socketId: socketId });
    parentPort.postMessage({ type: 'messageHistory', data: sessionHistories[socketId], socketId: socketId });

    process.exit(0);
}