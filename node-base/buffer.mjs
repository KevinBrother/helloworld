import { Buffer } from 'node:buffer';

var buf1 = Buffer.from('test');
console.log(
  '%c [ buf1 ]-5',
  'font-size:13px; background:pink; color:#bf2c9f;',
  buf1
);

var buf2 = Buffer.alloc(10);
buf2[0] = 'h';
buf2[1] = 1;
buf2[2] = 255;
console.log(
  '%c [ buf2 ]-11',
  'font-size:13px; background:pink; color:#bf2c9f;',
  buf2,
  buf2[0],
  buf2[1],
  buf2[2]
);
