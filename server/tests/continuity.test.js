const { startContinuity } = require('./continuity');
const { MongoClient } = require('mongodb');
const { Server } = require('socket.io');

jest.mock('mongodb');
jest.mock('socket.io');

describe('Continuity', () => {
  let ioMock;
  let clientDBMock;
  let continuityCollectionMock;

  beforeEach(() => {
    ioMock = { on: jest.fn() };
    clientDBMock = { connect: jest.fn(), db: jest.fn() };
    continuityCollectionMock = { insertOne: jest.fn(), find: jest.fn().mockReturnValue({ toArray: jest.fn() }) };
    MongoClient.mockReturnValue(clientDBMock);
    clientDBMock.db.mockReturnValue({ collection: jest.fn().mockReturnValue(continuityCollectionMock) });
  });

  test('should connect to MongoDB and handle continuity', async () => {
    await startContinuity(ioMock);
    expect(clientDBMock.connect).toHaveBeenCalled();
    expect(ioMock.on).toHaveBeenCalledWith('connection', expect.any(Function));
  });

  test('should save and retrieve continuity data', async () => {
    const socketMock = { on: jest.fn(), emit: jest.fn(), id: 'socket1' };
    ioMock.on.mockImplementationOnce((event, callback) => callback(socketMock));
    await startContinuity(ioMock);
    const saveHandler = socketMock.on.mock.calls[0][1];
    await saveHandler({ data: 'test' });
    expect(continuityCollectionMock.insertOne).toHaveBeenCalledWith({ socketId: 'socket1', data: 'test' });
    const getHandler = socketMock.on.mock.calls[1][1];
    await getHandler();
    expect(socketMock.emit).toHaveBeenCalledWith('continuity', expect.any(Array));
  });
});