module.exports = class MyPlugin {
  constructor(options) {
    this.options = options;
  }

  apply(compiler) {
    console.log('welcome to my plugin', this.options, compiler);
  }
};
