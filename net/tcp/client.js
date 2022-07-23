const net = require('net');
const HOST = '127.0.0.1';
const PORT = 3000;

// 创建连接客户端
const client = net.createConnection(PORT, HOST, () => {
  console.log('客户端连接成功 日志1');
});

// 监听连接后开始发送数据
client.on('connect', () => {
  console.log('客户端连接成功 日志2');
  client.write('客户端发送的第一条数据');

  setTimeout(() => {
    client.write('客户端发送的第二条数据');
    client.write('客户端发送的第三条数据');
    client.write('客户端发送的第四条数据');
    client.write('客户端发送的第五条数据');
  }, 1000);
});

// 监听服务端数据
client.on('data', (buffer) => {
  console.log('接受到服务端的消息', buffer.toString());
});

client.on('error', (err) => {
  console.error(
    '%c [ err ]-29',
    'font-size:13px; background:pink; color:#bf2c9f;',
    err
  );
});

client.on('close', (err) => {
  console.log('[ 客户端连接断开？ ] >', err);
});
