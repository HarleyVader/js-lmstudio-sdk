const { startDatabase } = require('./database');
const { MongoClient } = require('mongodb');
const { Server } = require('socket.io');

jest.mock('mongodb');
jest.mock('socket.io');

describe('Database', () => {
  let ioMock;
  let clientDBMock;
  let messagesCollectionMock;

  beforeEach(() => {
    ioMock = { on: jest.fn() };
    clientDBMock = { connect: jest.fn(), db: jest.fn() };
    messagesCollectionMock = { insertOne: jest.fn(), find: jest.fn().mockReturnValue({ toArray: jest.fn() }) };
    MongoClient.mockReturnValue(clientDBMock);
    clientDBMock.db.mockReturnValue({ collection: jest.fn().mockReturnValue(messagesCollectionMock) });
  });

  test('should connect to MongoDB and handle messages', async () => {
    await startDatabase(ioMock);
    expect(clientDBMock.connect).toHaveBeenCalled();
    expect(ioMock.on).toHaveBeenCalledWith('connection', expect.any(Function));
  });

  test('should save client message and generate LLM reply', async () => {
    const socketMock = { on: jest.fn(), emit: jest.fn(), id: 'socket1' };
    ioMock.on.mockImplementationOnce((event, callback) => callback(socketMock));
    await startDatabase(ioMock);
    const messageHandler = socketMock.on.mock.calls[0][1];
    await messageHandler('Hello');
    expect(messagesCollectionMock.insertOne).toHaveBeenCalledTimes(2);
    expect(socketMock.emit).toHaveBeenCalledWith('message', expect.any(String));
  });
});