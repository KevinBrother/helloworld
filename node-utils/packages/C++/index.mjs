import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const addon = require('./build/Release/addon.node');

console.log('结果:', addon.add(3, 5));  // 输出结果: 8
