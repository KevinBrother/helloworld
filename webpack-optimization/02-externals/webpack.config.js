const { resolve } = require('path');
const getBaseConfig = require('../webpack.base.config');
const { merge } = require('webpack-merge');
const HtmlWebpackExternalsPlugin = require('html-webpack-externals-plugin');

module.exports = merge(getBaseConfig(__dirname), {
  entry: {
    first: resolve(__dirname, './src/first.tsx'),
    second: resolve(__dirname, './src/second.tsx')
  },
  plugins: [
    new HtmlWebpackExternalsPlugin({
      externals: [
        // CDN的方式
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

        // 本地的方式
        /*      {
          module: 'react',
          entry: 'umd/react.production.min.js',
          global: 'React'
        },
        {
          module: 'react-dom',
          entry: 'umd/react-dom.production.min.js',
          global: 'ReactDOM'
        } */
      ]
    })
  ]
});
