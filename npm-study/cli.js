//  解析命令并分发给各自的command，然后执行
const Npm = require('./npm');

// 1. 获取 命令的参数，npm [command] [...args]

// 2. 把获取npm实例
const npm = new Npm();
// 3. 给npm自己设置并裁剪参数
npm.load();
const cmd = npm.args.shift();
npm.exec(cmd, npm.args);
