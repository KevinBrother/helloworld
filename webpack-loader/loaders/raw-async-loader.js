const loaderUtils = require('loader-utils');
const fs = require('fs');
const path = require('path');

module.exports = function (source) {
  const options = this.query || {};

  const callback = this.async();

  fs.readFile(path.join(__dirname, './a-loader.js'), 'utf-8', (err, data) => {
    if (err) {
      callback(err, '');
    }

    callback(data, options);
  });
};
