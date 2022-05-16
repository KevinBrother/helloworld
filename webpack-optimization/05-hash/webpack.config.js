const { resolve } = require('path');
const getBaseConfig = require('../webpack.base.config');
const { merge } = require('webpack-merge');
const HtmlWebpackExternalsPlugin = require('html-webpack-externals-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = merge(getBaseConfig(__dirname), {
  devServer: { open: true },
  entry: {
    first: resolve(__dirname, './src/first.tsx'),
    second: resolve(__dirname, './src/second.tsx'),
    lodash: resolve(__dirname, './src/lodash.tsx')
  },

  optimization: {
    splitChunks: {
      cacheGroups: {
        common: {
          name: 'common',
          minSize: 0,
          minChunks: 1,
          chunks: 'all'
        }
      }
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: resolve(__dirname, './index.html'),
      chunks: ['common', 'first'],
      filename: 'line.html'
    }),
    new HtmlWebpackPlugin({
      template: resolve(__dirname, './index.html'),
      chunks: ['common', 'lodash'],
      filename: 'lodash.html'
    }),
    new HtmlWebpackExternalsPlugin({
      externals: [
        // 本地的方式
        {
          module: 'react',
          entry: 'umd/react.production.min.js',
          global: 'React'
        },
        {
          module: 'react-dom',
          entry: 'umd/react-dom.production.min.js',
          global: 'ReactDOM'
        },
        {
          module: 'echarts',
          entry: 'dist/echarts.min.js',
          global: 'echarts'
        }
      ]
    })
  ],
  stats: {
    ids: true
  }
});
