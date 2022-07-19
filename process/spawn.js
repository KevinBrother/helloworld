const { spawn } = require('child_process');

const childProcess = spawn('ls', ['-lh', './']);

// childProcess.stdout.on('data', (data) => {
//   console.log('[ received chunk data ] >', data.toString());
// });

// TODO 定义一个流接收子进程的数据
childProcess.stdout.pipe(process.stdout);

console.log(process.pid, childProcess.pid);
