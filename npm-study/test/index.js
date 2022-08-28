// const { readdir } = require('node:fs/promises');
const fs = require('fs');
const path = '~/.npm/_cacache/index-v5';

/* readdir(path)
  .then((rst) => {
    console.log('[ rst ] >', rst);
  })
  .catch((err) => {
    console.log(err);
  }); */
fs.readdir(path, function (err, rst) {
  console.log('[ err, rst ] >', err, rst);
});
