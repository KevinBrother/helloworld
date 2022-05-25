import fs from 'node:fs';

const ws = fs.createWriteStream('test.txt');
console.log(
  '%c [ ws ]-4',
  'font-size:13px; background:pink; color:#bf2c9f;',
  ws
);

ws.once('open', (fd) => {
  console.log('对于test.txt的写入流打开成功', fd);
});

ws.once('close', (fd) => {
  console.log('对于test.txt的写入流关闭成功', fd);
});

ws.write('first');
ws.write('\nsecond');
ws.write('\nthird');

// ws.close();
ws.end();
