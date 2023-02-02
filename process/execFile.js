const { execFile } = require('child_process');

execFile('node', ['--version'], (err, stdout, stderr) => {
  console.log('[ {err,stdout, stderr} ] >', { err, stdout, stderr });
});
