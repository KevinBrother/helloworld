const http2 = require('http2');

const NUM_REQUESTS = 5;
// 测试 HTTP/2
console.log('\n--- Testing HTTP/2 ---');
const client = http2.connect('http://localhost:8080');

for (let i = 0; i < NUM_REQUESTS; i++) {
  const req = client.request({
    ':path': `/${i % 2 === 0 ? 'slow' : 'fast'}`,
    ':method': 'POST'
  });

  req.on('response', (headers, flags) => {
    // Handle response headers if needed
  });

  req.on('data', (chunk) => {
    console.log(chunk.toString());
  });

  req.on('end', () => {
    // Handle end of response if needed
  });

  // 发送请求数据
  const payload = JSON.stringify({
    name: "John Doe",
    age: 30,
    hobby: "coding",
  });
  req.write(payload);
  req.end();
}

client.on('close', () => {
  console.log('HTTP/2 client closed');
});