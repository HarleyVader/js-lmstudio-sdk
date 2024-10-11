import { initServer } from './initServer.js';
import { initReadline } from './initReadline.js';
import { handleError } from './errorHandler.js';
import { startWebHost } from './webhost.js';
import { startBrain } from './brain/brain.js';
import { startSocketRouter } from './socketRouter/socketRouter.js';
import { PORT, DOMAIN_NAME } from './config.js';

// Ensure this import statement is correct
import { messageRouter } from './messageRouter.js';

async function startServer() {
  const { app, server, io } = await startWebHost();
  startSocketRouter(server);
  startBrain(io);
  messageRouter(io); // Ensure this function is called if needed
}

function getServerUrl(server) {
  const protocol = server instanceof require('https').Server ? 'https' : 'http';
  return `${protocol}://${DOMAIN_NAME}:${PORT}`;
}

const { app, server, io } = initServer();
const rl = initReadline();

const serverUrl = getServerUrl(server);
console.log(`Server URL: ${serverUrl}`);

server.listen(PORT, () => {
  console.log(`Listening on ${serverUrl}`);
});

startServer().then(() => {
  console.log('Server started successfully');
}).catch(handleError);