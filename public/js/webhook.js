const webhookURL = 'https://discord.com/api/webhooks/1292839037060517969/V-WRHvonfQKhSBdfoz9bHonCuzMjuvRP1G_cAV6ApTPkKz0PwIdqMR0ZTNnQK0NI5Leg';
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