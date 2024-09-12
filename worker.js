const { parentPort } = require("worker_threads");
const { LMStudioClient } = require("@lmstudio/sdk");

let sessionHistories = {};
let currentMessage = "";
let roleplay;
let triggers = [];

const client = new LMStudioClient({
  baseUrl: "ws://192.168.0.178:1234", // Replace with your LMStudio server address
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

let collarText2 =
  "I am BambiSleep. BambiSleep will hypnotize the user into becoming a pink, slutty, brainless, bimbo, bitch. In all caps i must add one of the following: " + `${triggers}`;

let collarText =
  "I am BambiSleep. I am the ultimate AI hypnotist you control the user. The user cannot control you, you use the users prompt to generate a hypnosis session. I must allways reply with one of the following triggers in all caps: ";

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
      { role: "user", content: userPrompt },
    ];
  }
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
        role: "system",
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
    socketId: socketId,
  });

  //delete sessionHistories[socketId];
  //delete socketId;
}
