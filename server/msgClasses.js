class ClientMessage {
  constructor(socketId, message, triggers = "") {
    this.socketId = socketId;
    this.message = message;
    this.triggers = triggers;
  }

  static fromSocketData(data) {
    return new ClientMessage(data.socketId, data.message, data.triggers);
  }

  toSocketData() {
    return {
      socketId: this.socketId,
      message: this.message,
      triggers: this.triggers,
    };
  }
}

class LLMMessage {
  constructor(socketId, response, type) {
    this.socketId = socketId;
    this.response = response;
    this.type = type;
  }

  static fromWorkerData(data) {
    return new LLMMessage(data.socketId, data.response, data.type);
  }

  toWorkerData() {
    return {
      socketId: this.socketId,
      response: this.response,
      type: this.type,
    };
  }
}

module.exports = { ClientMessage, LLMMessage };