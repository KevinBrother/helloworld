const { resolve } = require('path');
const getBaseConfig = require('../webpack.base.config');
const { merge } = require('webpack-merge');
const HtmlWebpackExternalsPlugin = require('html-webpack-externals-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = merge(getBaseConfig(__dirname), {
  optimization: {
    /*    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /(react|react-dom)/,
          name: 'vendor',
          chunks: 'all'
        }
      }
    } */
    splitChunks: {
      minSize: 0,
      cacheGroups: {
        commons: {
          name: 'commons',
          chunks: 'all',
          minChunks: 2
        }
      }
    }
  }
});
