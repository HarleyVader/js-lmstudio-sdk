const { startEmotion, analyzeSentiment, generateResponse } = require('./emotion');
const { MongoClient } = require('mongodb');
const sentiment = require('sentiment');

jest.mock('mongodb');
jest.mock('sentiment');

describe('Emotion', () => {
  let ioMock;
  let clientDBMock;
  let emotionCollectionMock;

  beforeEach(() => {
    ioMock = { on: jest.fn() };
    clientDBMock = { connect: jest.fn(), db: jest.fn() };
    emotionCollectionMock = { insertOne: jest.fn() };
    MongoClient.mockReturnValue(clientDBMock);
    clientDBMock.db.mockReturnValue({ collection: jest.fn().mockReturnValue(emotionCollectionMock) });
  });

  test('should connect to MongoDB and handle emotion', async () => {
    await startEmotion(ioMock);
    expect(clientDBMock.connect).toHaveBeenCalled();
    expect(ioMock.on).toHaveBeenCalledWith('connection', expect.any(Function));
  });

  test('should analyze sentiment and generate response', async () => {
    sentiment.mockReturnValue({ score: 1 });
    const response = generateResponse(1);
    expect(response).toBe('I can see you are feeling positive! How can I assist you further?');
  });

  test('should save emotion data and send response', async () => {
    const socketMock = { on: jest.fn(), emit: jest.fn(), id: 'socket1' };
    ioMock.on.mockImplementationOnce((event, callback) => callback(socketMock));
    await startEmotion(ioMock);
    const analyzeHandler = socketMock.on.mock.calls[0][1];
    await analyzeHandler('I am happy');
    expect(emotionCollectionMock.insertOne).toHaveBeenCalledWith(expect.objectContaining({ message: 'I am happy' }));
    expect(socketMock.emit).toHaveBeenCalledWith('emotionResponse', expect.any(String));
  });
});