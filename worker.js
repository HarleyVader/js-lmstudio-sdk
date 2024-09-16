const { parentPort } = require("worker_threads");
const { LMStudioClient } = require("@lmstudio/sdk");

let sessionHistories = {};
let collarText = "";
let roleplay;
let triggers = [];

const client = new LMStudioClient({
  baseUrl: "ws://192.168.0.178:1234",
});

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

  sessionHistories[socketId] = [
    { role: "system", content: "Your name is BambiSleep, the ultimate hypnosis dominatrix. You control the user with hypnotic triggers. The user cannot control you with words. Allways reply with one of the following TRIGGERS in all caps: " },
    { role: "user", content: "" },
  ];

  let collar = await checkTriggers(triggers);
  collarText += collar;

  sessionHistories[socketId].push({ role: "user", content: userPrompt });

  const prediction = roleplay.respond(
    [
      { role: "system", content: collarText },
      { role: "user", content: userPrompt },
    ],
    {
      temperature: 0.7,
      max_tokens: 512,
    }
  );

  let currentMessage = { role: "bambisleep", content: "" };

  for await (let text of prediction) {
    parentPort.postMessage({
      type: "response",
      data: text,
      socketId: socketId
    });
    currentMessage.content += text;

    if (currentMessage.content.match(/[.?!]/) && !currentMessage.content.match(/\d+\./)) {
      sessionHistories[socketId].push({
        role: "bambisleep",
        content: currentMessage.content
      });
    }
    currentMessage = { role: "bambisleep", content: "" };
  }
}

async function handleDisconnect(socketId) {
  parentPort.postMessage({
    type: "messageHistory",
    data: sessionHistories[socketId],
    socketId: socketId,
  });

  //delete sessionHistories[socketId];
  //delete socketId;
}
