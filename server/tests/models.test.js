const mongoose = require('mongoose');
const { Message } = require('./models');

describe('Models', () => {
  test('Message schema should be defined correctly', () => {
    const message = new Message({
      socketId: 'socket1',
      sender: 'user',
      message: 'Hello'
    });
    expect(message.socketId).toBe('socket1');
    expect(message.sender).toBe('user');
    expect(message.message).toBe('Hello');
    expect(message.timestamp).toBeInstanceOf(Date);
  });
});