const path = require('path'); // Import the 'path' module for working with file paths
const fs = require('fs').promises; // Import the 'fs' module for file system operations
const http = require('http'); // Import the 'http' module for creating an HTTP server // Import the 'socket.io' module for real-time communication
const {parentPort } = require('worker_threads'); // Import the 'worker_threads' module for running JavaScript in separate threads

require("dotenv").config(); // Load environment variables from a .env file

const API = process.env.API; // Get the value of the 'API' environment variable

// Listen for messages from the parent thread
parentPort.on('message', async (msg) => {
	if (msg.type === 'speech2text') {
		await query(msg.filename, msg.url).then((response) => {
			console.log(JSON.stringify(response));
		});
	}
});

// Function to query the speech-to-text API
async function query(filename) {
	const data = fs.readFileSync(filename); // Read the audio file synchronously
	const response = await fetch(
		"https://zbtmns156kit18q6.us-east-1.aws.endpoints.huggingface.cloud",
		{
			headers: { 
				"Accept" : "application/json",
				"Content-Type": "audio/flac" 
			},
			method: "POST",
			body: data,
		}
	);
	const result = await response.json(); // Parse the response as JSON
	return result;
}

query("sample1.flac").then((response) => {
	console.log(JSON.stringify(response));
});
