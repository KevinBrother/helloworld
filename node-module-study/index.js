// 模块的路径依赖
// console.log('[ module ] >', module.paths);

require('./beRequired.js');
require('./beRequired.js').message = 'hello';
console.log(
  '%c [ require("./beRequired.js").message ]-7',
  'font-size:13px; background:pink; color:#bf2c9f;',
  require('./beRequired.js').message
);

console.log('[ require.catch ] >', require.cache);
