const { MongoClient } = require('mongodb');


const uri = "mongodb://localhost:27017"; // Replace with your MongoDB connection string
const clientDB = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function startDatabase(io) {
  try {
    await clientDB.connect();
    console.log('Connected to MongoDB');
    const db = clientDB.db('chatDB');
    const messagesCollection = db.collection('messages');

    // Save client message and LLM replies
    io.on('connection', (socket) => {
      socket.on('message', async (prompt) => {
        const timestamp = new Date();
        const message = {
          socketId: socket.id,
          timestamp: timestamp,
          prompt: prompt,
          reply: null
        };

        try {
          // Save the client message
          await messagesCollection.insertOne(message);
          console.log('Client message saved to MongoDB');

          // Generate reply from LLM
          const reply = await client.llm.generate(prompt);
          message.reply = reply;

          // Save the reply
          await messagesCollection.updateOne(
            { _id: message._id },
            { $set: { reply: reply } }
          );
          console.log('LLM reply saved to MongoDB');

          // Send the reply back to the client
          socket.emit('message', reply);
        } catch (error) {
          console.error('Error saving message or generating reply:', error);
        }
      });
    });
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
  }
}

module.exports = { startDatabase };