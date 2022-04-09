const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
module.exports = {
  mode: 'production',
  entry: {
    index: path.resolve(__dirname, './src/index.js'),
    bar: path.resolve(__dirname, './src/bar.js')
  },
  output: {
    filename: '[name]_[chunkhash:8].js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      { test: /\.js|jsx$/, use: 'babel-loader' },
      {
        test: /\.less$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'less-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [require('autoprefixer')]
              }
            }
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.jsx']
  },
  devServer: {
    // static: __dirname + '/public'
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
      chunks: ['index']
    }),
    new HtmlWebpackPlugin({
      template: './public/search.html',
      filename: 'search.html',
      chunks: ['bar']
    })
  ]
};
