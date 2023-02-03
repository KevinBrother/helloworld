const { spawn } = require('child_process');

function startDaemon() {
  const daemon = spawn('node', ['daemon.js'], {
    detached: true,
    stdio: 'ignore'
  });
  const { pid: p_pid, ppid: p_ppid } = process;
  const { pid: d_pid, ppid: d_ppid } = daemon;
  console.log('%c [ before daemon ]-9', 'font-size:13px; background:pink; color:#bf2c9f;', {
    p_pid,
    p_ppid,
    d_pid,
    d_ppid
  });
  daemon.unref();
  console.log('%c [ after daemon ]-9', 'font-size:13px; background:pink; color:#bf2c9f;', {
    p_pid,
    p_ppid,
    d_pid,
    d_ppid
  });
}

startDaemon();
