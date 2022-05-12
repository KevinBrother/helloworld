const { resolve } = require('path');
const { runLoaders } = require('loader-runner');
const fs = require('fs');
runLoaders(
  {
    resource: resolve(__dirname, './default.txt'),
    loaders: [
      {
        // loader: resolve(__dirname, '../loaders/raw-loader.js'),
        // loader: resolve(__dirname, '../loaders/raw-async-loader.js'),
        loader: resolve(__dirname, '../loaders/emitFile-loader.js'),
        options: {
          name: 'option的名称'
        }
      }
    ],
    context: {
      minimize: true
    },
    readResource: fs.readFile.bind(fs)
  },
  (err, result) => {
    if (err) {
      console.log(err);
    }
    console.log(result, result.result);
  }
);
