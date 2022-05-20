const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

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
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.less$/i,
        use: [
          // compiles Less to CSS
          'style-loader',
          'css-loader',
          'less-loader'
        ]
      },
      {
        test: /\.(js|jsx|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript'
            ]
          }
        }
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource'
      }
    ]
  },
  optimization: {
    splitChunks: {
      chunks: 'all'
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
    })
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.tsx'],
    alias: {
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@assert': path.resolve(__dirname, 'src/assert')
    }
  }
};
