// @ts-check
const { fork } = require('child_process');

const { cpus } = require('os');

const server = require('net').createServer();

server.listen(3000);

process.title = 'node-master';

const workers = {};

const createWorker = () => {
  const worker = fork('./worker.js');
  worker.on('message', (message) => {
    console.log('%c [ message ]-17', 'font-size:13px; background:pink; color:#bf2c9f;', message);
  });

  worker.on('exit', (code, signal) => {
    console.log('%c [ code, signal ]-21', 'font-size:13px; background:pink; color:#bf2c9f;', code, signal);
    delete workers[worker.pid];
  });

  worker.send('server', server);

  workers[worker.pid] = worker;
  const { pid: workerPid } = worker;
  const { pid: processPid } = process;
  console.log('%c [ worker ]-28', 'font-size:13px; background:pink; color:#bf2c9f;', { workerPid, processPid });
};

for (let i = 0; i < cpus().length; i++) {
  createWorker();
}

process.once('SIGINT', close.bind(this, 'SIGINT'));
process.once('SIGQUIT', close.bind(this, 'SIGQUIT'));
process.once('SIGTERM', close.bind(this, 'SIGTERM'));
process.once('exit', close.bind(this));

function close(code) {
  console.log('进程退出！', code);

  if (code !== 0) {
    for (let pid in workers) {
      console.log('master process exited, kill worker pid: ', pid);

      workers[pid].kill('SIGINT');
    }
  }

  process.exit(0);
}
