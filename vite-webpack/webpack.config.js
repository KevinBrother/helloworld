const HtmlWebpackPlugin = require('html-webpack-plugin');

const path = require('path');
console.log('[  ] >', path.resolve(__dirname, './index.html'));
module.exports = {
  mode: 'development',
  entry: './src/main.tsx',
  devServer: {
    open: true
  },
  module: {
    rules: [
      {
        test: /.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /.(ts|tsx)$/,
        loader: 'babel-loader'
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource'
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  },
  devtool: 'source-map',
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, './webpack-template.html')
    })
  ]
};
