const { parentPort } = require("worker_threads");
const { LMStudioClient } = require("@lmstudio/sdk");
const { count } = require("console");
const { set } = require("express/lib/application");

let sessionHistories = {};
let currentMessage = "";
let roleplay;
let triggers = [];

const client = new LMStudioClient({
  baseUrl: "ws://192.168.0.178:1234" // Replace with your LMStudio server address
});

parentPort.on("message", async (msg) => {
  if (msg.type === "message") {
    await handleMessage(msg.data, msg.socketId);
  } else if (msg.type === "triggers") {
    triggers = msg.triggers;
    //parentPort.postMessage({ type: "log", data: `Triggers: ${triggers}` });
  } else if (msg.type === "disconnect") {
    handleDisconnect(msg.socketId);
  }
});

let collarText =
  "I am BambiSleep. I am the ultimate AI hypnotist. I must allways reply with one of the following triggers in all caps: ";

async function checkTriggers(triggers) {
  let triggersArray = [];
  for (let i = 0; i < triggers.length; i++) {
    triggersArray.push(triggers[i]);
  }
  return triggersArray;
}

async function handleMessage(userPrompt, socketId) {
  if (!roleplay) {
    roleplay = await client.llm.get({});
  }

  let collar = await checkTriggers(triggers);
  collarText += collar;

  if (!sessionHistories[socketId]) {
    sessionHistories[socketId] = [
      { role: "system", content: collarText },
      { role: "user", content: userPrompt }
    ];
  }
  sessionHistories[socketId].push({ role: "user", content: userPrompt });

  const prediction = roleplay.respond(
    [
      { role: "system", content: collarText },
      { role: "user", content: userPrompt }
    ],
    {
      temperature: 0.7,
      max_tokens: 512
    }
  );

  // LLM prediction gun
  for await (let text of prediction) {
    parentPort.postMessage({
      type: "response",
      data: text,
      socketId: socketId
    });
    currentMessage += text;

    if (currentMessage.match(/[.?!]$/)) {
      sessionHistories[socketId].push({
        role: "BambiSleep",
        content: currentMessage
      });
      currentMessage = "";
    }
  }
}

async function handleDisconnect(socketId) {
  parentPort.postMessage({
    type: "messageHistory",
    data: sessionHistories[socketId],
    socketId: socketId
  });
  
  //delete sessionHistories[socketId];
}
