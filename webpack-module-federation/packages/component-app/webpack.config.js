const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
// 引入moduleFederation
const { ModuleFederationPlugin } = require('webpack').container;
const { dependencies } = require('./package.json');

module.exports = {
  mode: 'development',
  entry: './index.js',
  output: {
    clean: true,
    // path: path.resolve(__dirname, 'dist'),
    // publicPath: 'http://localhost:8082/',
    filename: '[name].bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: ['@babel/preset-react']
        }
      }
    ]
  },
  resolve: {
    extensions: ['.jsx', '.js', '.json']
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'componentApp',
      // library: { type: 'var', name: 'component-app' },
      filename: 'remoteEntry.js',
      exposes: {
        './Example': './src/components/Example.jsx',
        './Example2': './src/components/Example2.jsx'
        // './App': './src/App'
      },
      remotes: {
        'main-app': 'mainApp@http://localhost:8081/remoteEntry.js'
      },
      shared: {
        ...dependencies,
        react: {
          singleton: true,
          requiredVersion: dependencies['react']
        },
        'react-dom': {
          singleton: true,
          requiredVersion: dependencies['react-dom']
        }
      }
      // shared: ['react', 'react-dom'],
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html'
    }),
    new webpack.HotModuleReplacementPlugin()
  ],
  devServer: {
    hot: true
  }
};
