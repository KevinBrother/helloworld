const { info, time, timeEnd } = require('console');

const compute = () => {
  let sum = 0;
  info('开始计时');
  time('计算耗时');
  for (let i = 0; i < 1000000; i++) {
    // for (let i = 0; i < 1e10; i++) {
    sum += 1;
  }
  info('结束计时');
  timeEnd('计算耗时');
  return sum;
};

// module.exports = compute;
process.title = 'compute process';
process.on('message', (msg) => {
  console.log({ msg, processPId: process.pid });
  const sum = compute();
  process.send(sum);
  // process.exit();
});
