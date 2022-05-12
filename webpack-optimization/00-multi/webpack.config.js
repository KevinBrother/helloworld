const { resolve } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = function () {
  return {
    mode: 'production',
    entry: {
      first: resolve(__dirname, './src/first.tsx'),
      second: resolve(__dirname, './src/second.tsx')
    },
    output: {
      filename: '[name].js',
      clean: true,
      // path: resolve(dirname, './dist')
      path: resolve(__dirname, 'dist')
    },
    module: {
      rules: [
        { test: /\.(ts|tsx)$/, use: 'babel-loader' },
        { test: /\.txt$/, use: 'raw-loader' },
        { test: /\.css$/, use: ['style-loader', 'css-loader'] },
        {
          test: /\.less$/,
          use: ['style-loader', 'css-loader', 'less-loader']
        }
      ]
    },
    resolve: {
      extensions: ['.ts', '.tsx']
    },

    plugins: [
      new HtmlWebpackPlugin({
        filename: 'first.html',
        template: resolve(__dirname, './index.html'),
        chunks: ['first']
      }),
      new HtmlWebpackPlugin({
        filename: 'second.html',
        template: resolve(__dirname, './index.html'),
        chunks: ['second']
      })
    ]
  };
};
