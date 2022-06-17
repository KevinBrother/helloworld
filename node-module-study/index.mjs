// 模块的路径依赖
// console.log('[ module ] >', module.paths);

import beRequired from './beRequired.js';
beRequired.message = 5;
import beRequired2 from './beRequired.js';

console.log('[ require.catch ] >', beRequired);
console.log(
  '%c [ beRequired2 ]-7',
  'font-size:13px; background:pink; color:#bf2c9f;',
  beRequired2
);
console.log(
  '%c [ beRequired2 ]-13',
  'font-size:13px; background:pink; color:#bf2c9f;',
  beRequired2 === beRequired
);
