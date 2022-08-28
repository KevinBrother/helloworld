class Config {
  constructor(definitions) {
    this.data = definitions;
  }

  get(key) {
    return this.data[key];
  }
}

module.exports = Config;
