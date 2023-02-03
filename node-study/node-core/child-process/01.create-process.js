const http = require('http');
const { pid, ppid, cwd, platform } = process;
console.log('process的pid', { pid, ppid, cwd: cwd(), platform });
http.createServer().listen(3000, () => {
  process.title = '测试进程 node.js';
  const { pid, ppid, cwd, platform } = process;
  console.log('process的pid', { pid, ppid, cwd: cwd(), platform });
});
