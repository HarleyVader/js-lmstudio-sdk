const { ClientMessage, LLMMessage } = require('./messages');

describe('Messages', () => {
  test('ClientMessage should create an instance from socket data', () => {
    const data = { socketId: 'socket1', message: 'Hello', triggers: 'trigger1' };
    const clientMessage = ClientMessage.fromSocketData(data);
    expect(clientMessage).toBeInstanceOf(ClientMessage);
    expect(clientMessage.socketId).toBe('socket1');
    expect(clientMessage.message).toBe('Hello');
    expect(clientMessage.triggers).toBe('trigger1');
  });

  test('LLMMessage should create an instance from worker data', () => {
    const data = { socketId: 'socket1', response: 'Hi', type: 'greeting' };
    const llmMessage = LLMMessage.fromWorkerData(data);
    expect(llmMessage).toBeInstanceOf(LLMMessage);
    expect(llmMessage.socketId).toBe('socket1');
    expect(llmMessage.response).toBe('Hi');
    expect(llmMessage.type).toBe('greeting');
  });
});