import fs from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// esm中没有__filename,和__dirname，需要转换
const __filename = fileURLToPath(import.meta.url);
console.log(
  '%c [ __filename ]-6',
  'font-size:13px; background:pink; color:#bf2c9f;',
  __filename
);

const __dirname = path.dirname(__filename);
console.log(
  '%c [ __dirname ]-13',
  'font-size:13px; background:pink; color:#bf2c9f;',
  __dirname
);

const dir = path.resolve(__dirname, 'asserts/haha/diddd');
const mkdir = fs.mkdirSync(dir, { recursive: true });
console.log(
  '%c [ mkdir ]-22',
  'font-size:13px; background:pink; color:#bf2c9f;',
  mkdir
);

console.log(
  '%c [ dir ]-4',
  'font-size:13px; background:pink; color:#bf2c9f;',
  dir
);

const fd = fs.openSync(path.resolve(dir, './test.txt'), 'w');
console.log(
  '%c [ fd ]-4',
  'font-size:13px; background:pink; color:#bf2c9f;',
  fd
);

const fsWrite = fs.writeSync(fd, 'Hello, World!');
console.log(
  '%c [ fsWrite ]-37',
  'font-size:13px; background:pink; color:#bf2c9f;',
  fsWrite
);

const fsClose = fs.closeSync(fd);
console.log(
  '%c [ fsClose ]-40',
  'font-size:13px; background:pink; color:#bf2c9f;',
  fsClose
);
