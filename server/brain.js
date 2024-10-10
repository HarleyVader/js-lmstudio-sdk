const { startWebHost } = require('./webhost');
const { startMessageRouter } = require('../messageRouter');
const { startDatabase } = require('./database');
const { LMStudioClient } = require("@lmstudio/sdk");

async function startServer() {
  const { app, server, io } = await startWebHost();
  startMessageRouter(app, io);
  startDatabase(io);
}

const client = new LMStudioClient({
  baseUrl: "ws://192.168.0.178/:1234", // Replace with your LMStudio server address
});

async function loadModel() {
  const modelConfig = {
    identifier: "TheBloke/SOLAR-10.7B-Instruct-v1.0-uncensored-GGUF/solar-10.7b-instruct-v1.0-uncensored.Q4_K_M.gguf",
    config: {
      gpuOffload: 0.2,
      context_length: 8192,
      embedding_length: 8192,
    },
  };

  await client.llm.load(modelConfig.identifier, {
    config: modelConfig.config,
  });
}

const filteredWords = require("../fw.json");

function filter(message) {
  if (typeof message !== "string") {
    message = String(message);
  }
  return message
    .split(" ")
    .map((word) => {
      return filteredWords.includes(word.toLowerCase()) ? " " : word;
    })
    .join(" ");
}

async function sessionHistori1es(data, socketId) {
  sessionHistories[socketId] = data;

  if (!sessionHistories[socketId]) {
    console.error(`No valid session history found for socket ID: ${socketId}`);
    return;
  } else if (sessionHistories[socketId]) {
    const Histories = Array.from(sessionHistories[socketId]);
    const jsonHistory = JSON.stringify(Histories);
    const fileName = `${socketId}.json`;
    const filePath = path.join(__dirname, "history", fileName);

    await fs
      .writeFile(filePath, jsonHistory)
      .then(() => {
        console.log(`Message history saved for socket ID: ${socketId}`);
      })
      .catch((error) => {
        console.error(`Error saving message history for socket ID: ${socketId}`, error);
      });
  }
}

startServer().then(() => {
  console.log('Server started successfully');
}).catch(err => {
  console.error('Error starting server:', err);
});