const { startServer, loadModel, sessionHistori1es } = require('./brain');
const { startWebHost } = require('./server/js/webhost');
const { startMessageRouter } = require('../messageRouter');
const { startDatabase } = require('./server/js/database');
const { LMStudioClient } = require('@lmstudio/sdk');

jest.mock('./server/js/webhost');
jest.mock('../messageRouter');
jest.mock('./server/js/database');
jest.mock('@lmstudio/sdk');

describe('Brain', () => {
  let clientMock;

  beforeEach(() => {
    clientMock = { llm: { load: jest.fn() } };
    LMStudioClient.mockReturnValue(clientMock);
  });

  test('should start the server', async () => {
    startWebHost.mockResolvedValue({ app: {}, server: {}, io: {} });
    await startServer();
    expect(startWebHost).toHaveBeenCalled();
    expect(startMessageRouter).toHaveBeenCalled();
    expect(startDatabase).toHaveBeenCalled();
  });

  test('should load the model', async () => {
    await loadModel();
    expect(clientMock.llm.load).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
  });

  test('should save session histories', async () => {
    const data = [{ message: 'Hello' }];
    const socketId = 'socket1';
    await sessionHistori1es(data, socketId);
    expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), JSON.stringify(data));
  });
});