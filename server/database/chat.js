import { MongoClient } from 'mongodb';
import { MONGO_URI } from './config.js';

export async function startDatabase(io) {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db('chatDB');
    const messagesCollection = db.collection('messages');

    io.on('connection', (socket) => {
      socket.on('message', async (message) => {
        try {
          await messagesCollection.insertOne({ socketId: socket.id, message });
          console.log('Message saved to MongoDB');
        } catch (err) {
          console.error('Error saving message to MongoDB:', err);
        }
      });
      socket.on('getMessages', async () => {
        try {
          const messages = await messagesCollection.find().toArray();
          socket.emit('messages', messages);
          console.log('Messages retrieved from MongoDB');
        } catch (err) {
          console.error('Error retrieving messages from MongoDB:', err);
        }
      });
    });
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
  } finally {
    await client.close();
  }
}