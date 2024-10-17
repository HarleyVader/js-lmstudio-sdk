const { parentPort } = require("worker_threads");
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { type } = require("os");

let sessionHistories = {}; // Initialize sessionHistories as an empty object
let triggers;
let collarText;

async function checkTriggers(triggers) {
  if (!triggers) {
    return triggers;
  } else {
    return triggers;
  }
}

if (!collarText) {
  fs.readFile(path.join(__dirname, 'role.json'), 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading role.json:', err);
      return;
    }
    const roleData = JSON.parse(data);
    collarText = roleData.role;
  });
}

async function getSessionHistories(collarText, userPrompt, socketId) {
  if (!sessionHistories) {
    sessionHistories = {};
  }

  if (!sessionHistories[socketId]) {
    sessionHistories[socketId] = [];
  }

  if (sessionHistories[socketId].length === 0) {
    sessionHistories[socketId].push([
      { role: "system", content: collarText },
      { role: "user", content: userPrompt },
    ]);
  }

  return sessionHistories[socketId];
}

async function saveSessionHistories(collarText, userPrompt, finalContent, socketId) {
  if (!sessionHistories) {
    sessionHistories = {};
  }

  if (!sessionHistories[socketId]) {
    sessionHistories[socketId] = [];
  }

  if (sessionHistories[socketId].length !== 0) {
    sessionHistories[socketId].push([
      { role: "system", content: collarText },
      { role: "user", content: userPrompt },
      { role: "assistant", content: finalContent },
    ]);
  }

  return sessionHistories[socketId];
}

async function handleMessage(userPrompt, socketId) {
  try {
    let collar = await checkTriggers(triggers);
    collarText += collar;

    sessionHistories = await getSessionHistories(collarText, userPrompt, socketId);

    const response = await axios.post('http://192.168.0.178:1234/v1/chat/completions', {
      model: "solar-10.7b-instruct-v1.0-uncensored",
      messages: [
        { role: "system", content: collarText },
        { role: "user", content: userPrompt },
      ],
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
      saveSessionHistories(collarText, userPrompt, finalContent, socketId);
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
  } else if (msg.type === "message") {
    parentPort.postMessage({ 'log': `Message to worker: ${msg.data}` });
    await handleMessage(msg.data, msg.socketId);
  } else if (msg.type === "disconnect") {
    await handleDisconnect(msg.socketId);
    parentPort.postMessage({ 'log': `Session Histories: ${JSON.stringify(sessionHistories)}` });
  }
  
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
  } else {
    parentPort.postMessage("log", sessionHistories, socketId);
  }
}
