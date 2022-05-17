const { resolve } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackExternalsPlugin = require('html-webpack-externals-plugin');

module.exports = function () {
  return {
    mode: 'production',
    entry: resolve(__dirname, './src/index.tsx'),
    output: {
      filename: '[name].[contenthash:8].js',
      clean: true,
      path: resolve(__dirname, './dist')
    },
    module: {
      rules: [
        { test: /\.(ts|tsx)$/, use: 'babel-loader' },
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
        template: resolve(__dirname, './public/index.html')
      }),
      new HtmlWebpackExternalsPlugin({
        externals: [
          {
            module: 'react',
            entry: 'https://unpkg.com/react@17.0.1/umd/react.production.min.js',
            global: 'React'
          },
          {
            module: 'react-dom',
            entry:
              'https://unpkg.com/react-dom@17.0.1/umd/react-dom.production.min.js',
            global: 'ReactDOM'
          }
        ]
      })
    ]
  };
};
