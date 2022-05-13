const { resolve } = require('path');
const { runLoaders } = require('loader-runner');
const fs = require('fs');
runLoaders(
  {
    resource: resolve(__dirname, './image.css'),
    loaders: [
      {
        loader: resolve(__dirname, '../loaders/sprite-loader.js')
      }
    ],
    context: {
      minimize: true
    },
    readResource: fs.readFile.bind(fs)
  },
  (err, result) => {
    if (err) {
      console.log(
        '%c [ err ]-19',
        'font-size:13px; background:pink; color:#bf2c9f;',
        err
      );
    }
    // console.log(result, result.result);
    console.log(
      '%c [ result ]-22',
      'font-size:13px; background:pink; color:#bf2c9f;',
      result
    );
  }
);
