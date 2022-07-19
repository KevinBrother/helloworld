// 观察活动监视器出现的进程信息
const http = require('http');

http.createServer().listen(3001, () => {
  process.title = '测试进程 Node.js'; // 进程进行命名
  console.log(`process.pid: `, process.pid); // process.pid: 20279
  console.log(`server at http://localhost:3001`);
});
