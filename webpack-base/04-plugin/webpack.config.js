const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const ZipPlugin = require('zip-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

// const webpack = require('webpack'); // 访问内置的插件
module.exports = {
  entry: path.resolve(__dirname, './src/index.js'),
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        // 不要同时使用 style-loader 与 mini-css-extract-plugin
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  },

  plugins: [
    // new webpack.ProgressPlugin(),
    new MiniCssExtractPlugin(),
    // copyPlugin在内层的to属性可能有bug，在外层没问题
    /* new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'src'),
          // from: 'src',
          to: path.resolve(__dirname, 'copy-src')
        }
      ]
    }), */
    new ZipPlugin({ filename: 'dist.zip' }),
    // new HtmlWebpackPlugin({ template: path.resolve(__dirname, './index.html') })
    new HtmlWebpackPlugin(),
    new CleanWebpackPlugin()
  ]
};
