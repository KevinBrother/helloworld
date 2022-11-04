const path = require('path');
const esbuild = require('esbuild');
// const { CleanWebpackPlugin } = require('clean-webpack-plugin');
// const CopyPlugin = require('copy-webpack-plugin');
const BASE_DIR = path.resolve(__dirname);
module.exports = {
  mode: 'production',
  // target: 'node',
  entry: './src/index.ts',
  // devtool: 'source-map',
  /*   output: {
    library: {
      name: 'StudioLocalLib',
      type: 'umd'
    },
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js'
  }, */
  module: {
    rules: [
      {
        test: /\.(j|t)s$/,
        loader: 'esbuild-loader',
        exclude: /node_modules/,
        options: {
          implementation: esbuild
        }
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@common': path.resolve(BASE_DIR, 'src/common')
    }
  }

  /*   plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        {
          from: __dirname + './index.d.ts',
          to: __dirname + './dist/index.d.ts'
        }
      ]
    })
  ] */
};
