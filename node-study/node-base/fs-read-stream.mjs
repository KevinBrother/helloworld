import fs from 'node:fs';

const rs = fs.createReadStream('test.txt');
const ws = fs.createWriteStream('copy-test.txt');
/* console.log(
  '%c [ ws ]-4',
  'font-size:13px; background:pink; color:#bf2c9f;',
  rs
);
 */
rs.once('open', (fd) => {
  console.log('对于test.txt的可读流打开成功', fd);
});

rs.once('close', (fd) => {
  console.log('对于test.txt的可读流关闭成功', fd);
  ws.end();
});

ws.once('open', (fd) => {
  console.log('对于test.txt的写入流打开成功', fd);
});

ws.once('close', (fd) => {
  console.log('对于test.txt的写入流关闭成功', fd);
});

// 可读流，监听data事件，才开始操作，每次读取一块数据
rs.on('data', (chunk) => {
  console.log(
    '%c [ rs ]-4',
    'font-size:13px; background:pink; color:#bf2c9f;',
    chunk
  );
  ws.write(chunk);
});
