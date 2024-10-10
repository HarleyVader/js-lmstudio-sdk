import mongoose from 'mongoose';
const { Schema } = mongoose;

const historySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actions: [{ type: String }],
  timestamp: { type: Date, default: Date.now },
});

const History = mongoose.model('History', historySchema);

export default History;