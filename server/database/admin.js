import mongoose from 'mongoose';
const { Schema } = mongoose;

const adminSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;