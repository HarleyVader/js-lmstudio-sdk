import { LMStudioClient } from '@lmstudio/sdk';
import { startContinuity } from './server/js/continuity.js';
import { startEmotion } from './server/js/emotion.js';
import { startMemory } from './server/js/memory.js';

const client = new LMStudioClient({
  baseUrl: "ws://192.168.0.178/:1234",
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

export async function startBrain(io) {
  startContinuity(io);
  startEmotion(io);
  startMemory(io);
  
  await loadModel();
}