const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    first: './src/pages/First/Index.tsx',
    second: './src/pages/Second/Index.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
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
      template: './index.html',
      filename: './first.html',
      chunks: ['first']
    }),
    new HtmlWebpackPlugin({
      template: './index.html',
      filename: './second.html',
      chunks: ['second']
    }),
    new MiniCssExtractPlugin()
  ],
  resolve: {
    alias: {
      '@assert': path.resolve(__dirname, './src/assert'),
      '@utils': path.resolve(__dirname, './src/utils')
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
  }
};
