const http = require('http');
// const compute = require('./utils/compute.js');
const { fork } = require('child_process');

const [url, port] = ['127.0.0.1', 3001];

const server = http.createServer((req, res) => {
  console.log(
    '%c [ req.url ]-12',
    'font-size:13px; background:pink; color:#bf2c9f;',
    req.url
  );
  if (req.url === '/computed') {
    process.title = 'master process';
    // const sum = compute();
    const computeProcess = fork('./utils/compute.js');
    computeProcess.send('开启一个子进程');
    computeProcess.on('message', (sum) => {
      console.log('计算结果 sum 为: $s &s %s ', sum);
      res.end(`Sum is ${sum}`);
    });
    computeProcess.on('close', (code, signal) => {
      console.log({ code, signal });
      console.log(
        `收到close事件，子进程收到信号 ${signal} 而终止，退出码 ${code}`
      );
      computeProcess.kill();
    });
  } else {
    res.end('ok');
  }
});

server.listen(port, url, () => {
  console.log(
    '%c [ port, url ]-20',
    'font-size:13px; background:pink; color:#bf2c9f;',
    `http://${url}:${port}`
  );
});
