const Config = require('./node-modules/config');
const definitions = require('./utils/config/definitions');

class Npm {
  config = new Config(definitions);

  load() {
    // TODO 使用 nopt 获取剩余参数
    // script转换: node cli.js cache ls => cache ls
    this.args = process.argv.slice(2, process.argv.length);
  }

  async cmd(cmd) {
    // TODO 验证cmd是否支持
    const Impl = require(`./command/${cmd}`);

    // 把npm实例传递给各自的command对象
    const impl = new Impl(this);
    return impl;
  }

  // 执行npm命令
  async exec(cmd, args) {
    // 获取到对应命令的实例对象。
    const command = await this.cmd(cmd);

    // 使用
    command.exec(args);
  }

  get cache() {
    return this.config.get('cache');
  }
}

module.exports = Npm;
