
// 引入的脚本会共享作用域
importScripts('./varB.js');
importScripts('./varA.js');

console.log(username, 'worker');

// importScripts('http://wwww.XXX.com/worker.js');

