const { parentPort } = require("worker_threads");
const { LMStudioClient } = require("@lmstudio/sdk");
const fs = require('fs');
const path = require('path');

let sessionHistories = {};
let role = require("./fw.json");
let collarText = role.role;

fs.readFile(path.join(__dirname, 'role.json'), 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading role.json:', err);
    return;
  }
  try {
    const roleData = JSON.parse(data);
    collarText = roleData.role;
  } catch (parseError) {
    console.error('Error parsing role.json:', parseError);
  }
});


let roleplay;
let triggers = [];

const client = new LMStudioClient({
  baseUrl: "ws://192.168.0.178:1234",
});

async function checkTriggers(triggers) {
  let triggersArray = [];
  for (let i = 0; i < triggers.length; i++) {
    triggersArray.push(triggers[i]);
  }
  return triggersArray;
}

async function handleMessage(userPrompt, socketId) {
  try {
    if (!roleplay) {
      roleplay = await client.llm.get({});
    }

    let collar = await checkTriggers(triggers);
    collarText += collar;

    if (!sessionHistories[socketId]) {
      sessionHistories[socketId] = [];
    }

    sessionHistories[socketId].push([
      { role: "system", content: collarText },
      { role: "user", content: userPrompt },
    ]);

    const prediction = roleplay.respond(
      [
        { role: "system", content: collarText },
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0.4,
        max_tokens: 512,
      }
    );

    let currentMessage = { role: "assistant", content: "" };

    for await (let text of prediction) {
      parentPort.postMessage({
        type: "response",
        data: text,
        socketId: socketId
      });
      currentMessage.content += text;

      if (currentMessage.content.match(/[.?!]/) && !currentMessage.content.match(/\d+\./)) {
        sessionHistories[socketId].push({
          role: "system",
          content: currentMessage.content
        });
      }
      currentMessage = { role: "assistant", content: "" };
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
}

parentPort.on("message", async (msg) => {
  if (msg.type === "triggers") {
    triggers = msg.triggers;
    //parentPort.postMessage({ type: "log", data: `Triggers arrive: ${triggers}`, socketId: msg.socketId });
  } else if (msg.type === "message") {
    await handleMessage(msg.data, msg.socketId);
  } else if (msg.type === "disconnect") {
    handleDisconnect(msg.socketId);
  }
});

async function handleDisconnect(socketId) {
  parentPort.postMessage({
    type: "messageHistory",
    data: sessionHistories[socketId],
    socketId: socketId,
  });

  //delete sessionHistories[socketId];
  //delete socketId;
}
