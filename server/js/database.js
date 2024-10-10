const { MongoClient } = require('mongodb');
const { Message } = require('../.config/models'); // Adjust the path as needed

async function connectToMongoDB() {
  const uri = "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.3.2";
  const client = new MongoClient(uri);

  try {
      await client.connect();
      console.log("Connected to MongoDB");
  } catch (err) {
      console.error("Error connecting to MongoDB:", err);
  } finally {
      await client.close();
  }
}

connectToMongoDB();

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
        const userMessage = new Message({
          socketId: socket.id,
          timestamp: timestamp,
          sender: 'user',
          message: prompt
        });

        try {
          // Save the client message
          await messagesCollection.insertOne(userMessage);
          console.log('Client message saved to MongoDB');

          // Generate reply from LLM
          const reply = await client.llm.generate(prompt);
          const llmMessage = new Message({
            socketId: socket.id,
            timestamp: new Date(),
            sender: 'LLM',
            message: reply
          });

          // Save the LLM reply
          await messagesCollection.insertOne(llmMessage);
          console.log('LLM reply saved to MongoDB');

          // Send the reply back to the client
          socket.emit('message', reply);
        } catch (error) {
          console.error('Error saving message or generating reply:', error);
        }
      });

      socket.on('getHistory', async () => {
        try {
          const history = await messagesCollection.find({ socketId: socket.id }).toArray();
          socket.emit('history', history);
        } catch (error) {
          console.error('Error retrieving message history:', error);
        }
      });
    });
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
  }
}

module.exports = { startDatabase };