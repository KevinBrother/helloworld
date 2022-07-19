const http = require('http');
const compute = require('./utils/compute.js');

const [url, port] = ['127.0.0.1', 3001];

const server = http.createServer((req, res) => {
  console.log(
    '%c [ req.url ]-12',
    'font-size:13px; background:pink; color:#bf2c9f;',
    req.url
  );
  if (req.url === '/computed') {
    const sum = compute();

    res.end(`Sum is ${sum}`);
  } else {
    res.end('ok');
  }
});

server.listen(port, url, () => {
  console.log(
    '%c [ port, url ]-20',
    'font-size:13px; background:pink; color:#bf2c9f;',
    `http://${url}:${port}`
  );
});
