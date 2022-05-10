const { resolve } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: resolve(__dirname, './src/index.tsx'),
  output: {
    filename: 'main.js',
    path: resolve(__dirname, './dist')
  },
  module: {
    rules: [
      { test: /\.(ts|tsx)$/, use: 'babel-loader' },
      { test: /\.txt$/, use: 'raw-loader' },
      { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
      {
        test: /\.less$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'less-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx']
  },
  optimization: {
    minimizer: [new CssMinimizerPlugin()]
  },
  plugins: [
    new HtmlWebpackPlugin({ template: resolve(__dirname, './index.html') }),
    new MiniCssExtractPlugin()
  ]
};
