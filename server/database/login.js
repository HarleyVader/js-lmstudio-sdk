import mongoose from 'mongoose';
const { Schema } = mongoose;

const loginSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  loginTime: { type: Date, default: Date.now },
  ipAddress: { type: String },
});

const Login = mongoose.model('Login', loginSchema);

export default Login;