const { exec } = require('child_process');

exec('node -v', (err, stdout, stderr) => {
  console.log(
    '%c [ err, stdout, stderr ]-4',
    'font-size:13px; background:pink; color:#bf2c9f;',
    {
      err,
      stdout,
      stderr
    }
  );
});
