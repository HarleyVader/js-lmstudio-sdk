const { MongoClient } = require('mongodb');

const uri = "mongodb://localhost:27017"; // Replace with your MongoDB connection string
const clientDB = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function startContinuity(io) {
  try {
    await clientDB.connect();
    console.log('Connected to MongoDB for Continuity');
    const db = clientDB.db('continuityDB');
    const continuityCollection = db.collection('continuities');

    io.on('connection', (socket) => {
      socket.on('saveContinuity', async (continuityData) => {
        try {
          await continuityCollection.insertOne({ socketId: socket.id, ...continuityData });
          console.log('Continuity data saved to MongoDB');
        } catch (error) {
          console.error('Error saving continuity data:', error);
        }
      });

      socket.on('getContinuity', async () => {
        try {
          const continuities = await continuityCollection.find({ socketId: socket.id }).toArray();
          socket.emit('continuity', continuities);
        } catch (error) {
          console.error('Error retrieving continuity data:', error);
        }
      });
    });
  } catch (err) {
    console.error('Error connecting to MongoDB for Continuity:', err);
  }
}

module.exports = { startContinuity };