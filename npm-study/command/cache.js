const path = require('path');
class Cache {
  constructor(npm) {
    this.npm = npm;
  }

  exec(args) {
    const cmd = args.shift();
    switch (cmd) {
      case 'clean':
        return this.clean(args);
      case 'ls':
        return this.ls(args);
    }
  }

  // TODO 清空缓存目录
  clean() {}

  ls(args) {
    // 获取缓存路径
    const cachePath = path.join(this.npm.cache, '_cacache');
    // TODO 如果args的长度大于0说明是要打印指定版本 如 npm cache ls react
  }
}

module.exports = Cache;
