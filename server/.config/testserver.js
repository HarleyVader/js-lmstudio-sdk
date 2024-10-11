const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 6969;

// SSL certificate and key from Let's Encrypt
const options = {
    key: fs.readFileSync('/home/brandynette/conf/web/bambisleep.chat/ssl/bambisleep.chat.key'),
    cert: fs.readFileSync('/home/brandynette/conf/web/bambisleep.chat/ssl/bambisleep.chat.pem')
};

app.get('/', (req, res) => {
    res.send('BambiSleep is alive');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

https.createServer(options, app).listen(port, (err) => {
    if (err) {
        console.error('Failed to start server:', err);
        return;
    }
    console.log(`HTTPS server running on port ${port}`);
});