const loaderUtils = require('loader-utils');

module.exports = function (source) {
  // const options = loaderUtils.getOptions(this);
  const options = this.query || {};

  const json = JSON.stringify(source)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  const result = `
          option: ${JSON.stringify(options)};
           export default ${json};
           `;

  this.callback(null, result);
};
