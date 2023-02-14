const http = require('http');
const server = http.createServer((req, res) => {
  console.log(req);
  res.writeHead(200, { 'Content-Type': 'text/plan' });
  res.end('I am worker, pid: ' + process.pid + ', ppid: ' + process.ppid);
  throw new Error('worker process exception!'); // 测试异常进程退出、重建
});

server.on('connection', (socket) => {
  server.emit('connection', socket);
});

/* setTimeout(function () {
  server.on('connection', (socket) => {
    server.emit('connection', socket);
  });
}, 3000); */

server.listen(3000);
