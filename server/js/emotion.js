const sentiment = require('sentiment');
const { MongoClient } = require('mongodb');

const uri = "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.3.2"; // Replace with your MongoDB connection string
const clientDB = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function startEmotion(io) {
  try {
    await clientDB.connect();
    console.log('Connected to MongoDB for Emotion');
    const db = clientDB.db('emotionDB');
    const emotionCollection = db.collection('emotions');

    io.on('connection', (socket) => {
      socket.on('analyzeEmotion', async (message) => {
        try {
          const sentimentScore = analyzeSentiment(message);
          const response = generateResponse(sentimentScore);
          await emotionCollection.insertOne({ socketId: socket.id, message, sentimentScore, response });
          socket.emit('emotionResponse', response);
          console.log('Emotion analyzed and response sent');
        } catch (error) {
          console.error('Error analyzing emotion:', error);
        }
      });
    });
  } catch (err) {
    console.error('Error connecting to MongoDB for Emotion:', err);
  }
}

function analyzeSentiment(message) {
  const result = sentiment(message);
  return result.score;
}

function generateResponse(sentimentScore) {
  let response = '';

  if (sentimentScore > 0) {
    response = 'I can see you are feeling positive! How can I assist you further?';
  } else if (sentimentScore < 0) {
    response = 'I sense some negativity. Is there something bothering you?';
  } else {
    response = 'How can I help you today?';
  }

  return response;
}

module.exports = { startEmotion };