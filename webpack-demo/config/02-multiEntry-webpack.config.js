const path = require('path');

// 多入口的配置可以是数组或对象的方式，其中对象的方式最可扩展
module.exports = {
  // entry: ['./src/index.js', './src/secondEntry.js']
  entry: {
    first: './src/index.js',
    second: './src/secondEntry.js'
  },

  // 多入口不能一次输出到一个文件中，可以配合占位符【name】来输出多个文件
  output: {
    filename: '[name].bundle.js'
  }
};
