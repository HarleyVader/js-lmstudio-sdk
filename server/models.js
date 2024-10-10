const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the schema for messages
const messageSchema = new Schema({
  socketId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  sender: { type: String, required: true }, // 'user' or 'LLM'
  message: { type: String, required: true }
});

// Create models from the schemas
const Message = mongoose.model('Message', messageSchema);

module.exports = { Message };