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

server.on('listening', () => {
  console.log(`服务器开启在 ${HOST}:${PORT} 监听日志`);
});

// 监听连接
server.on('connection', (socket) => {
  console.log('被链接了');
});

server.on('close', () => {
  console.log('[ server close ] >');
});

server.on('error', (err) => {
  console.error(err);

  if (err.code === 'EADDRINUSE') {
    console.log('地址正在使用，重试中。。。');

    setTimeout(() => {
      server.close();
      server.listen(PORT, HOST);
    }, 1000);
  } else {
    console.error('服务器异常', err);
  }
});
