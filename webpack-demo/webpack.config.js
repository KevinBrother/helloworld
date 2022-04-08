const path = require('path');
module.exports = {
  entry: './src/index.js', // 入口文件

  output: {
    filename: 'main.js', // 默认输出的文件名
    path: path.resolve(__dirname, 'dist') // 默认输出的地址
  },
  module: {
    rules: [
      { test: /\.css$/, use: 'css-loader' },
      { test: /\.ts$/, use: 'ts-loader' }
    ]
  }
};
