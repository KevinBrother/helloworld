const loaderUtils = require('loader-utils');
module.exports = function (source) {
  console.log('a loader', source, this);

  const url = loaderUtils.interpolateName(this, '[name].[ext]', source);
  console.log(
    '%c [ url ]-6',
    'font-size:13px; background:pink; color:#bf2c9f;',
    url
  );

  this.emitFile(url, source);
  return source;
};
