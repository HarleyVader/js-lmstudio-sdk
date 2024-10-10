const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the schema for users
const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

// Define the schema for chats
const chatSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Define the schema for history
const historySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actions: [{ type: String }],
  timestamp: { type: Date, default: Date.now },
});

// Define the schema for logins
const loginSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  loginTime: { type: Date, default: Date.now },
  ipAddress: { type: String },
});

// Define the schema for admins
const adminSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Create models from the schemas
const User = mongoose.model('User', userSchema);
const Chat = mongoose.model('Chat', chatSchema);
const History = mongoose.model('History', historySchema);
const Login = mongoose.model('Login', loginSchema);
const Admin = mongoose.model('Admin', adminSchema);

module.exports = { User, Chat, History, Login, Admin, Message };