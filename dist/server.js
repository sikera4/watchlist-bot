import http from 'http';
import './bot.js';
const PORT = process.env.PORT ?? 3000;
http
    .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('My Telegram bot is running\\n');
})
    .listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map