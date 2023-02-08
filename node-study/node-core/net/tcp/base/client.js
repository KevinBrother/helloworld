const net = require('net');
const HOST = '127.0.0.1';
const PORT = 3000;
process.title = 'net tcp client';
console.log('client :', process.pid);

// 创建连接客户端
const client = net.createConnection(PORT, HOST, () => {
  console.log('客户端连接成功 传递数据的方法1');
});

client.on('connect', () => {
  console.log('客户端连接成功 传递数据的方法2');
});

// 监听服务端数据
client.on('data', (buffer) => {
  console.log('接受到服务端的消息', buffer.toString());
});

client.on('error', (err) => {
  console.error('%c [ err ]-29', 'font-size:13px; background:pink; color:#bf2c9f;', err);
});

client.on('close', (err) => {
  console.log('[ 服务端连接断开了 ] >', err);
});

const client2 = net.createConnection(PORT, HOST, () => {
  console.log('客户端2连接成功');
});

const client3 = net.createConnection(PORT, HOST, () => {
  console.log('客户端3连接成功');
  if (client2) {
    console.log('客户端连接对象是否同一个呢', client2 === client3);
  }
});
