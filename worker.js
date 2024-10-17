const { parentPort } = require("worker_threads");
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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

async function saveSessionHistories(finalContent, socketId) {
  if (!sessionHistories) {
    sessionHistories = {};
  }

  if (!sessionHistories[socketId]) {
    sessionHistories[socketId] = [];
  }

  if (sessionHistories[socketId].length !== 0) {
    sessionHistories[socketId].push(
      { role: "assistant", content: finalContent }
    );
  }

  return sessionHistories[socketId];
}

async function handleMessage(userPrompt, socketId) {
  try {
    let collar = await checkTriggers(triggers);
    collarText += collar;


    if (finalContent) {
      sessionHistories[socketId] = await saveSessionHistories(finalContent, socketId);
    } else {
      sessionHistories[socketId] = await getSessionHistories(collarText, userPrompt, socketId);
    }

    const response = await axios.post('http://192.168.0.178:1234/v1/chat/completions', {
      model: "llama-3.1-8b-lexi-uncensored-v2",
      messages: sessionHistories[socketId],
      temperature: 0.7,
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

    response.data.on('end', async () => {
      parentPort.postMessage({ 'response': finalContent });
      sessionHistories[socketId] = await saveSessionHistories(collarText, userPrompt, finalContent, socketId);
    });

  } catch (error) {
    console.error('Error handling message:', error);
    parentPort.postMessage({ 'log': `Error handling message: ${error}` });
  }
}

parentPort.on("message", async (msg) => {
  if (msg.type === "triggers") {
    triggers = msg.triggers;
  } else if (msg.type === "message") {
    await handleMessage(msg.data, msg.socketId);
  } else if (msg.type === "disconnect") {
    await sendSessionHistories(sessionHistories[msg.socketId], msg.socketId);
  }
});

async function handleResponse(response, socketId) {
  parentPort.postMessage({
    type: "response",
    data: response,
    socketId: socketId,
  });
}

async function sendSessionHistories(session, socketId) {
  if (session && session.length !== 0) {
    parentPort.postMessage({
      type: "messageHistory",
      data: session,
      socketId: socketId,
    });
    parentPort.postMessage({ type: "log", data: session, socketId: socketId });
  } else {
    parentPort.postMessage({ type: "log", data: "No session history to send", socketId: socketId });
  }
}