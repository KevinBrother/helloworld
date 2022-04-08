const path = require('path');
module.exports = {
  entry: path.resolve(__dirname, './src/index.js'),
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      // test 指定匹配规则， use指定使用的loader名称，（loader需要安装依赖，没用到可以不安装，即使写了也不会匹配到）
      { test: /\.txt$/, use: 'raw-loader' },
      { test: /\.css$/, use: 'css-loader' },
      { test: /\.ts$/, use: 'ts-loader' }
    ]
  }
};
