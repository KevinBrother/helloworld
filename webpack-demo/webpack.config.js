const path = require('path');

// 多入口的配置可以是数组或对象的方式，其中对象的方式最可扩展
// 多入口不能一次输出到一个文件中，可以配合占位符【name】来输出多个文件
module.exports = {
  // entry: ['./src/index.js', './src/secondEntry.js']
  entry: {
    first: './src/index.js',
    second: './src/secondEntry.js'
  },

  output: {
    filename: '[name].bundle.js'
  }

  /*   output: {
    filename: 'main.js', // 默认输出的文件名
    path: path.resolve(__dirname, 'dist') // 默认输出的地址
  } */
};
