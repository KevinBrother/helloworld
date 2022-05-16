const { resolve } = require('path');
const getBaseConfig = require('../webpack.base.config');
const { merge } = require('webpack-merge');
const HtmlWebpackExternalsPlugin = require('html-webpack-externals-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = merge(getBaseConfig(__dirname), {
  entry: {
    first: resolve(__dirname, './src/first.tsx'),
    second: resolve(__dirname, './src/second.tsx')
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
      chunks: ['common', 'second'],
      filename: 'second.html'
    }),
    new HtmlWebpackExternalsPlugin({
      externals: [
        // CDN的方式
        /*  {
          module: 'react',
          entry: 'https://unpkg.com/react@17.0.1/umd/react.production.min.js',
          global: 'React'
        },
        {
          module: 'react-dom',
          entry:
            'https://unpkg.com/react-dom@17.0.1/umd/react-dom.production.min.js',
          global: 'ReactDOM'
        },
        {
          module: 'echarts',
          entry:
            'https://cdnjs.cloudflare.com/ajax/libs/echarts/5.3.2/echarts.min.js',
          global: 'echarts'
        }
        */
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
