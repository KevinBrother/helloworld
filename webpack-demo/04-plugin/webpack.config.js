const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack'); // 访问内置的插件
// 不指定config，入口和输出，就默认走下面的这个配置，可能还有其他选项哦
module.exports = {
  entry: path.resolve(__dirname, './src/index.js'), // 入口文件
  output: {
    filename: 'main.js', // 默认输出的文件名
    path: path.resolve(__dirname, 'dist') // 默认输出的地址
  },

  plugins: [
    new webpack.ProgressPlugin(),
    // new HtmlWebpackPlugin({ template: path.resolve(__dirname, './index.html') })
    new HtmlWebpackPlugin()
  ]
};
