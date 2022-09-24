const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const webpackPaths = require('./webpack.paths');

const path = require('path');

const isDevelopment = process.env.NODE_ENV !== 'production';
console.log(
  '%c [ process.env.NODE_ENV ]-8',
  'font-size:13px; background:pink; color:#bf2c9f;',
  process.env.NODE_ENV
);

module.exports = {
  mode: isDevelopment ? 'development' : 'production',
  entry: {
    first: path.join(webpackPaths.containerPath, './First/Index.tsx'),
    second: path.join(webpackPaths.containerPath, './Second/Index.tsx')
  },
  output: {
    path: path.join(webpackPaths.rootPath, 'dist'),
    filename: '[name].[hash:8].js',
    clean: true
  },
  module: {
    rules: [
      {
        oneOf: [
          {
            test: /\.css$/i,
            use: [MiniCssExtractPlugin.loader, 'css-loader']
          },
          {
            test: /\.less$/i,
            use: [MiniCssExtractPlugin.loader, 'css-loader', 'less-loader']
          },
          {
            test: /\.(png|svg|jpg|jpeg|gif)$/i,
            type: 'asset/resource'
          },
          {
            test: /\.(js|jsx|tsx)$/,
            exclude: /node_modules/,
            use: [
              {
                loader: 'thread-loader',
                options: {
                  worker: require('os').cpus().length - 1
                }
              },
              {
                loader: 'babel-loader',
                options: {
                  cacheDirectory: true,
                  cacheCompression: false,
                  presets: [
                    '@babel/preset-env',
                    '@babel/preset-react',
                    '@babel/preset-typescript'
                  ]
                }
              }
            ]
          }
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(webpackPaths.rootPath, './index.html'),
      filename: './first.html',
      chunks: ['first']
    }),

    new HtmlWebpackPlugin({
      template: path.join(webpackPaths.rootPath, './index.html'),
      filename: './second.html',
      chunks: ['second']
    }),
    new MiniCssExtractPlugin(),
    new BundleAnalyzerPlugin({
      analyzerMode: 'server',
      analyzerPort: '50000'
    }),
    isDevelopment && new ReactRefreshWebpackPlugin()
  ],
  resolve: {
    alias: {
      '@assert': path.join(webpackPaths.srcPath, './assert'),
      '@utils': path.join(webpackPaths.srcPath, './utils')
    },
    extensions: ['.js', '.jsx', '.tsx', '.ts']
  },
  optimization: {
    splitChunks: {
      minSize: 0,
      chunks: 'all',
      cacheGroups: {
        /*      vender: {
          chunks: 'all',
          test: /(react|react-dom)/,
          priority: -10,
          name: 'vender'
        }, */

        common: {
          priority: -20,
          name: 'common'
        }
      }
    },
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin(),
      new TerserPlugin({
        parallel: true
      })
    ]
  },
  performance: {
    hints: false
  }
};
