var data = [1, 2];
let i = 0;
let result = [];
while (i < data.length) {
  result.push({ a: data[i++], b: data[i++], c: data[i++] });
}

console.log(result, i);

const os = require('os');

console.log(os.cpus());
