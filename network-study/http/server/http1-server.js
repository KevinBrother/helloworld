const http = require('http');

const server = http.createServer((req, res) => {
  const delay = req.url.includes('slow') ? 2000 : 500;  // 模拟慢请求
  setTimeout(() => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Response from HTTP/1.1 - ${req.url}\n`);
  }, delay);
});

server.listen(8080, () => {
  console.log('HTTP/1.1 server running at http://localhost:8080');
});