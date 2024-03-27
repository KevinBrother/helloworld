const http = require('http');

const server = http.createServer((req, res) => {

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
//   const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
const ipv4 = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
const ipv6 = req.headers['x-forwarded-for-ip'] || req.socket.remoteAddress;
  res.end(`you ipv4 is ${ipv4} and ipv6 is ${ipv6}\n`);
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});