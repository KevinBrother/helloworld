const pako = require("pako");
const fs = require("fs");
const path = require("path");

class Zip {
  constructor(tmpDeflatePath, tmpInflatePath, dataPath) {
    this.tmpDeflatePath = tmpDeflatePath;
    this.tmpInflatePath = tmpInflatePath;
    this.data = require(dataPath);
  }

  deflate(jsonStr) {
    const start = new Date();
    try {
      const output = pako.deflate(JSON.stringify(jsonStr));
      // console.log('压缩耗时', new Date() - start);

      fs.writeFileSync(this.tmpDeflatePath, output.toString());
    } catch (err) {
      console.log(`deflate${err}`);
    }
  }

  inflate(comStr) {
    const start = new Date();
    try {
      const jsonStr = pako.inflate(comStr);
      // console.log('解压耗时', new Date() - start);
      fs.writeFileSync(this.tmpInflatePath, jsonStr);
    } catch (err) {
      console.log(`inflate${err}`);
    }
  }
}

const tmpDeflatePath = path.resolve(__dirname, "./z1.txt");
const tmpInflatePath = path.resolve(__dirname, "./z2.json");
const dataPath = path.resolve(__dirname, "../../package.json");
const zip = new Zip(tmpDeflatePath, tmpInflatePath, dataPath);

// ========= 压缩 ==========
zip.deflate(zip.data);

// ========= inflate ==========
const buffer = fs.readFileSync(tmpDeflatePath);
const buffStr = buffer.toString();
// console.log('buffer:', buffStr)

console.time("new Uint8Array");
const uint8Array = new Uint8Array(buffStr.split(","));
console.timeEnd("new Uint8Array");

console.time("Buffer.from");
const blob = Buffer.from(uint8Array);
console.timeEnd("Buffer.from");
// console.log('blob:', binaryString(blob))

zip.inflate(uint8Array);

function binaryString(buffer) {
  let binary = "";
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    const byteString = byte.toString(2).padStart(8, "0");
    binary += byteString;
  }
  return binary;
}


function byte2Custom(byte) {
    const rst = byte.toString(2).padStart(8, "0");
    return rst;
}
console.log(byte2Custom(255, 2, 8));

console.log(Buffer.from([165]).toString('hex'))