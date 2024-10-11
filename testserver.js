const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 443;

// SSL certificate and key from Let's Encrypt
const options = {
    key: fs.readFileSync('/home/brandynette/conf/web/bambisleep.chat/ssl/bambisleep.chat.key'),
    cert: fs.readFileSync('/home/brandynette/conf/web/bambisleep.chat/ssl/bambisleep.chat.pem')
};

app.get('/', (req, res) => {
    res.send('BambiSleep is alive');
});

https.createServer(options, app).listen(port, () => {
    console.log(`HTTPS server running on port ${port}`);
});