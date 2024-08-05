const path = require('path'); // Import the 'path' module for working with file paths
const fs = require('fs').promises; // Import the 'fs' module for file system operations
const http = require('http'); // Import the 'http' module for creating an HTTP server // Import the 'socket.io' module for real-time communication
const { parentPort } = require('worker_threads'); // Import the 'worker_threads' module for running JavaScript in separate threads
const { log } = require('console');
const { send } = require('express/lib/response');

require("dotenv").config(); // Load environment variables from a .env file

const API = process.env.API; // Get the value of the 'API' environment variable

// Listen for messages from the parent thread
parentPort.on('message', async (msg) => {
	if (msg.type === 'speech2text') {
		await query(msg.filename, msg.url, msg.socketId).then((response) => {
			console.log(JSON.stringify(response));
		});
	}
});
socket.emit('speech2text', { fileLocation: mp3Url });
// Function to query the speech-to-text API
async function query(filename) {
	const data = fs.readFileSync(filename); // Read the audio file synchronously
	const response = await fetch(
		"https://zbtmns156kit18q6.us-east-1.aws.endpoints.huggingface.cloud",
		{
			headers: { 
				"Accept" : "application/json",
				"Content-Type": "audio/mp3" 
			},
			method: "POST",
			body: data,
		}
	);
	const result = await response.json(); // Parse the response as JSON
	log(result);
	return result;
}

// Function to handle the speech-to-text query
if (result) {
	sendResponse(result, socketId); // Send the response back to the parent thread
	parentPort.postMessage({ type: 'trigger', data: trigger, socketId: socketId }); // Send the response back to the parent thread
}

query("sample1.mp3").then((response) => {
	console.log(JSON.stringify(response));
});
