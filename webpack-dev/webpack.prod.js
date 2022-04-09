const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
module.exports = {
  mode: 'production',
  entry: {
    index: path.resolve(__dirname, './src/index.js'),
    bar: path.resolve(__dirname, './src/bar.js')
  },
  output: {
    filename: '[name]_[chunkhash:8].js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      { test: /\.js|jsx$/, use: 'babel-loader' },
      {
        test: /\.(png|jpg|gif|svg)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name(resourcePath, resourceQuery) {
                if (process.env.NODE_ENV === 'development') {
                  return '[path][name].[ext]';
                }
                return '[name]-[hash:8].[ext]';
              }
            }
          }
        ]
      },
      {
        test: /\.less$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'less-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [require('autoprefixer')]
              }
            }
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.jsx']
  },
  devServer: {
    // static: __dirname + '/public'
  },
  optimization: {
    minimizer: [new CssMinimizerPlugin()]
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: '[name]_[contenthash:8].css' }),
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
      chunks: ['index']
    }),
    new HtmlWebpackPlugin({
      template: './public/search.html',
      filename: 'search.html',
      chunks: ['bar']
    })
  ]
};
