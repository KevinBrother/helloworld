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
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      // 每一个匹配规则的loader从后往前调用，顺序不能颠倒，后面loader解析出来的内容给前一个loader使用，以此类推
      { test: /\.less$/, use: ['style-loader', 'css-loader', 'less-loader'] }
    ]
  }
};
