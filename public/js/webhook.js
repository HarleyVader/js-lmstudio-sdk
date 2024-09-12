const webhookURL = 'https://discord.com/api/webhooks/1262547624964264006/H1GTymOgXKBOtKXKfrhrvVa0oy-RfYC2HlE0Znv5fb23q_buv7mRDdEStLoPRW0txz2F';

        function sendMessageToDiscord(message) {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', webhookURL, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            const payload = JSON.stringify({
                content: message,
                username: 'BS',
            });
            xhr.send(payload);
        }