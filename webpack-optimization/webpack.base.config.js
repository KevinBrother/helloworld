const { resolve } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = function (dirname) {
  return {
    mode: 'production',
    entry: resolve(dirname, './src/index.tsx'),
    output: {
      filename: 'main.js',
      clean: true,
      path: resolve(dirname, './dist')
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
        template: resolve(dirname, './index.html')
      })
    ]
  };
};
