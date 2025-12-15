// Keep Codespace alive by pinging itself every 5 minutes
const http = require('http');

const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes
const PORT = process.env.PORT || 3000;

function keepAlive() {
    const options = {
        hostname: 'localhost',
        port: PORT,
        path: '/health',
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        console.log(`[Keep-Alive] Ping successful - Status: ${res.statusCode}`);
    });

    req.on('error', (error) => {
        console.error(`[Keep-Alive] Ping failed:`, error.message);
    });

    req.end();
}

// Start keep-alive pings
setInterval(keepAlive, PING_INTERVAL);
console.log(`[Keep-Alive] Started - Pinging every ${PING_INTERVAL / 1000} seconds`);

module.exports = keepAlive;
