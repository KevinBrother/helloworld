const path = require('path');
const cacache = require('../node-modules/cacache');
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

  // async ls(specs) {
  // TODO 如果specs的长度大于0说明是要打印指定版本 如 npm cache ls react
  async ls() {
    // 获取缓存路径
    const cachePath = path.join(this.npm.cache, '_cacache');
    // const cacheKeys = Object.keys(await cacache.ls(cachePath));
    const cacheKeys = await cacache.ls(cachePath);
    console.log(
      '%c [ cacheKeys ]-27',
      'font-size:13px; background:pink; color:#bf2c9f;',
      cacheKeys
    );
  }
}

module.exports = Cache;
