const net = require('net');
const HOST = '127.0.0.1';
const PORT = 3000;

// 创建TCP服务实例
const server = net.createServer();

// 监听端口
server.listen(PORT, HOST, () => {
  console.log(`服务器开启在 ${HOST}:${PORT} 回调日志`);
});

server.on('listening', () => {
  console.log(`服务器开启在 ${HOST}:${PORT} 监听日志`);
});

// 开启连接
server.on('connection', (socket) => {
  socket.setNoDelay(true);
  socket.on('data', (buffer) => {
    const msg = buffer.toString();
    console.log('连接后接受到的消息', msg);

    // write方法写入数据，发送给客户端
    socket.write(Buffer.from('您好' + msg));
  });

  socket.on('close', (err) => {
    console.log('[ 客户端连接断开了 ] >', err);
  });
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
