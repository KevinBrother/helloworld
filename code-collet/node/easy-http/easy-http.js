const http = require('http');

const server = http.createServer(function (req, res) {
  console.log('[ req ] >', req.url);
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Access-Control-Allow-Origin': '*'
  });
  res.end('Hello World\n');
});

server.listen(3000, () => {
  console.log('[ start at : ] >', 'http://localhost:3000');
});
