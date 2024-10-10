const { MongoClient } = require('mongodb');

const uri = "mongodb://localhost:27017"; // Replace with your MongoDB connection string
const clientDB = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function startMemory(io) {
  try {
    await clientDB.connect();
    console.log('Connected to MongoDB for Memory');
    const db = clientDB.db('memoryDB');
    const memoryCollection = db.collection('memories');

    io.on('connection', (socket) => {
      socket.on('saveMemory', async (memoryData) => {
        try {
          await memoryCollection.insertOne({ socketId: socket.id, ...memoryData });
          console.log('Memory saved to MongoDB');
        } catch (error) {
          console.error('Error saving memory:', error);
        }
      });

      socket.on('getMemory', async () => {
        try {
          const memories = await memoryCollection.find({ socketId: socket.id }).toArray();
          socket.emit('memory', memories);
        } catch (error) {
          console.error('Error retrieving memory:', error);
        }
      });
    });
  } catch (err) {
    console.error('Error connecting to MongoDB for Memory:', err);
  }
}

module.exports = { startMemory };