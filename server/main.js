import { initServer } from './initServer.js';
import { initReadline } from './initReadline.js';
import { handleError } from './errorHandler.js';
import { startWebHost } from './webhost.js';
import { startMessageRouter } from './messageRouter.js';
import { startDatabase } from './database.js';
import { startBrain } from './brain/brain.js';
import { PORT, DOMAIN_NAME } from './config.js';

async function startServer() {
  const { app, server, io } = await startWebHost();
  startMessageRouter(app, io);
  startDatabase(io);
  startBrain(io);
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