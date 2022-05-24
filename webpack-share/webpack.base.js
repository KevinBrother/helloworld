const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const fs = require('fs');

module.exports = {
  entry: {
    first: './src/pages/first',
    second: './src/pages/second'
  },
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[hash:8].js',
    clean: true
  },
  devServer: {
    open: true
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
            use: [
              // compiles Less to CSS
              MiniCssExtractPlugin.loader,
              'css-loader',
              'less-loader'
            ]
          },
          {
            test: /\.(js|jsx|tsx)$/,
            exclude: /node_modules/,
            use: [
              {
                loader: 'thread-loader',
                options: {
                  workers: require('os').cpus().length - 1
                }
              },
              {
                loader: 'babel-loader',
                options: {
                  presets: [
                    '@babel/preset-env',
                    '@babel/preset-react',
                    '@babel/preset-typescript'
                  ]
                }
              }
            ]
          },
          {
            test: /\.(png|svg|jpg|jpeg|gif)$/i,
            type: 'asset/resource'
          }
        ]
      }
    ]
  },
  optimization: {
    minimizer: [new CssMinimizerPlugin()],
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: Infinity,
      cacheGroups: {
        /*       vendors: {
          test: /(react|react-dom)/,
          name: 'vendors'
        } */
        vendors: {
          test: /node_modules/,
          name(module) {
            console.log('[ module =======================] >', module.context);
            //  fs.writeFile(path.resolve(__dirname, 'a.txt'), module, (err) => {});
            const packageName = module.context.match(
              /[\\/]node_modules[\\/](.*?)([\\/]|$)/
            )[1];
            return `npm.${packageName.replace('@', '')}`;
          }
        }
      }
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      chunks: ['first'],
      filename: 'first.html'
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      chunks: ['second'],
      filename: 'second.html'
    }),
    new MiniCssExtractPlugin()
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.tsx'],
    alias: {
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@assert': path.resolve(__dirname, 'src/assert')
    }
  }
};
