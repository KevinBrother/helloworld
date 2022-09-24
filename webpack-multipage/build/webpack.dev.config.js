const HtmlWebpackPlugin = require('html-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const webpackPaths = require('./webpack.paths');
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
const smp = new SpeedMeasurePlugin();

const path = require('path');
const { NODE_ENV, ANALYZER } = process.env;

const isDevelopment = NODE_ENV !== 'production';
console.log(
  '%c [ process.env ]-8',
  'font-size:13px; background:pink; color:#bf2c9f;',
  process.env.NODE_ENV,
  process.env.ANALYZER
);

const options = {
  mode: isDevelopment ? 'development' : 'production',
  entry: {
    first: path.join(webpackPaths.containerPath, './First/Index.tsx'),
    second: path.join(webpackPaths.containerPath, './Second/Index.tsx')
  },
  devServer: {
    open: true
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
            use: ['style-loader', 'css-loader']
          },
          {
            test: /\.less$/i,
            use: ['style-loader', 'css-loader', 'less-loader']
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
    ANALYZER &&
      new BundleAnalyzerPlugin({
        analyzerMode: 'server',
        analyzerPort: '50000'
      }),
    isDevelopment && new ReactRefreshWebpackPlugin()
  ].filter(Boolean),
  resolve: {
    alias: {
      '@assert': path.join(webpackPaths.srcPath, './assert'),
      '@utils': path.join(webpackPaths.srcPath, './utils')
    },
    extensions: ['.js', '.jsx', '.tsx', '.ts']
  },
  performance: {
    hints: false
  }
};

module.exports = ANALYZER ? smp.wrap(options) : options;
