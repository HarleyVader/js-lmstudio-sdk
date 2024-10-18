const { parentPort } = require("worker_threads");
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');

const bambisleepChalk = {
  primary: chalk.hex('#112727'),
  primaryAlt: chalk.hex('#216969'),
  secondary: chalk.hex('#1f0117'),
  tertiary: chalk.hex('#f2f2f2'),
  button: chalk.hex('#d4046c'),
  buttonAlt: chalk.hex('#110000'),
  error: chalk.hex('#d4046c').bold,
  success: chalk.hex('#216969').bold,
  info: chalk.hex('#017c8a').bold,
  warning: chalk.hex('#112727').bold
};

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
      console.error(bambisleepChalk.error('Error reading role.json:'), err);
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
    sessionHistories[socketId].push(
      { role: "system", content: collarText },
      { role: "user", content: userPrompt }
    );
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

async function getLoadedModels() {
  try {
    const response = await axios.get('http://192.168.0.178:1234/v1/models');
    const models = response.data.models;
    console.log(bambisleepChalk.info('Loaded Models:'), models);
    return models;
  } catch (error) {
    console.error(bambisleepChalk.error('Error fetching loaded models:'), error);
    return [];
  }
}

async function getMessages(socketId) {
  if (!sessionHistories || !sessionHistories[socketId]) {
    return [];
  }
  return sessionHistories[socketId];
}

async function handleMessage(userPrompt, socketId) {
  try {
    let collar = await checkTriggers(triggers);
    collarText += collar;

    let finalContent = ''; // Declare finalContent at the beginning

    sessionHistories[socketId] = await getSessionHistories(collarText, userPrompt, socketId);
    //darkidol-llama-3.1-8b-instruct-1.2-uncensored-imat
    const requestData = {
      model: getLoadedModels()[0].id,
      messages: getMessages(socketId),
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
    };

    parentPort.postMessage(bambisleepChalk.info('Request Data:'), JSON.stringify(requestData, null, 2)); // Log the request data

    const response = await axios.post('http://192.168.0.178:1234/v1/chat/completions', requestData, {
      responseType: 'stream',
    });

    let responseData = '';

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
      session = await saveSessionHistories(finalContent, socketId);
      await sendSessionHistories(session, msg.socketId);
    });

  } catch (error) {
    console.error(bambisleepChalk.error('Error handling message:'), error);
    parentPort.postMessage({ 'log': `Error handling message: ${error}` });
  }
}

parentPort.on("message", async (msg) => {
  if (msg.type === "triggers") {
    triggers = msg.triggers;
  } else if (msg.type === "message") {
    await handleMessage(msg.data, msg.socketId);
  } else if (msg.type === "disconnect") {
    
  }
});

async function handleResponse(response, socketId) {
  parentPort.postMessage({
    type: "response",
    data: response,
    socketId: socketId,
  });
}

async function sendSessionHistories(sessionHistory, socketId) {
  if (sessionHistory && Array.isArray(sessionHistory) && sessionHistory.length !== 0) {
    parentPort.postMessage({
      type: "messageHistory",
      data: sessionHistory,
      socketId: socketId,
    });
    parentPort.postMessage({ type: "log", data: "Session: " + JSON.stringify(sessionHistory), socketId: socketId });
  } else {
    parentPort.postMessage({ type: "log", data: "No session history to send", socketId: socketId });
  }
}