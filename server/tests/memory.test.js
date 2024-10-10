const { startMemory } = require('./memory');
const { MongoClient } = require('mongodb');
const { Server } = require('socket.io');

jest.mock('mongodb');
jest.mock('socket.io');

describe('Memory', () => {
  let ioMock;
  let clientDBMock;
  let memoryCollectionMock;

  beforeEach(() => {
    ioMock = { on: jest.fn() };
    clientDBMock = { connect: jest.fn(), db: jest.fn() };
    memoryCollectionMock = { insertOne: jest.fn(), find: jest.fn().mockReturnValue({ toArray: jest.fn() }) };
    MongoClient.mockReturnValue(clientDBMock);
    clientDBMock.db.mockReturnValue({ collection: jest.fn().mockReturnValue(memoryCollectionMock) });
  });

  test('should connect to MongoDB and handle memory', async () => {
    await startMemory(ioMock);
    expect(clientDBMock.connect).toHaveBeenCalled();
    expect(ioMock.on).toHaveBeenCalledWith('connection', expect.any(Function));
  });

  test('should save and retrieve memory data', async () => {
    const socketMock = { on: jest.fn(), emit: jest.fn(), id: 'socket1' };
    ioMock.on.mockImplementationOnce((event, callback) => callback(socketMock));
    await startMemory(ioMock);
    const saveHandler = socketMock.on.mock.calls[0][1];
    await saveHandler({ data: 'test' });
    expect(memoryCollectionMock.insertOne).toHaveBeenCalledWith({ socketId: 'socket1', data: 'test' });
    const getHandler = socketMock.on.mock.calls[1][1];
    await getHandler();
    expect(socketMock.emit).toHaveBeenCalledWith('memory', expect.any(Array));
  });
});