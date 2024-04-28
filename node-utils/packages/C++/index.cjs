const addon = require('./build/Release/addon.node');
const rst =  addon.add(3, 5);
console.log('结果:', rst);  // 输出结果: 8
