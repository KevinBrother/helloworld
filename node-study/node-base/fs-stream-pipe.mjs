import fs from 'node:fs';

const rs = fs.createReadStream('test.txt');
const ws = fs.createWriteStream('copy-test.txt');

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

rs.pipe(ws);
