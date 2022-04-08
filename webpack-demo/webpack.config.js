const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

// const webpack = require('webpack'); // 访问内置的插件
module.exports = {
  entry: './outer/index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          // from: 'outer',
          from: path.resolve(__dirname, 'outer'),
          to: path.resolve(__dirname, 'copy-src')
        }
      ]
    })
  ]
};
