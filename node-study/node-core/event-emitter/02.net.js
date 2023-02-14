const EventEmitter = require('events');
const net = require('net');
const HOST = '127.0.0.1';
const PORT = 3000;

// 创建TCP服务实例
const server = net.createServer();
process.title = 'net tcp server';
console.log('server :', process.pid);

// 监听端口
server.listen(PORT, HOST, () => {
  console.log(`服务器开启在 ${HOST}:${PORT} 回调日志`);
});

server.on('connection', (socket) => {
  console.log('tcp server connected ');

  socket.write(Buffer.from('hello'));
});

const event = new EventEmitter();
