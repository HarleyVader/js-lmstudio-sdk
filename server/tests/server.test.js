const { startServer } = require('./server');
const { Server } = require('socket.io');
const http = require('http');

jest.mock('http');
jest.mock('socket.io');

describe('Server', () => {
  let serverMock;
  let ioMock;

  beforeEach(() => {
    serverMock = { listen: jest.fn((port, callback) => callback()) };
    ioMock = { on: jest.fn() };
    http.createServer.mockReturnValue(serverMock);
    Server.mockReturnValue(ioMock);
  });

  test('should start the server successfully', async () => {
    await startServer();
    expect(serverMock.listen).toHaveBeenCalledWith(6969, expect.any(Function));
    expect(console.log).toHaveBeenCalledWith('Server is running on port 6969');
  });

  test('should handle errors when starting the server', async () => {
    const error = new Error('Server error');
    serverMock.listen.mockImplementationOnce((port, callback) => { throw error; });
    await expect(startServer()).rejects.toThrow('Server error');
    expect(console.error).toHaveBeenCalledWith('Error starting server:', error);
  });
});