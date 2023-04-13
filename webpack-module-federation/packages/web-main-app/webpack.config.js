const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
// const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const { ModuleFederationPlugin } = require('webpack').container;
const { dependencies } = require('./package.json');

module.exports = {
  mode: 'development',
  entry: './index.js',

  output: {
    clean: true,
    // path: path.resolve(__dirname, 'dist'),
    // publicPath: 'http://localhost:8081/',
    filename: '[name].bundle.js'
  },
  resolve: {
    extensions: ['.jsx', '.js', '.json']
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
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'mainApp',
      // library: { type: 'var', name: 'main-app' },
      filename: 'remoteEntry.js',
      exposes: {
        './Example': './src/components/Example.jsx',
        './Example1': './src/components/Example1.jsx'
      },
      remotes: {
        // 'component-app': 'component_app@http://localhost:8082/remoteEntry.js'
        'component-app': 'componentApp@http://localhost:8082/remoteEntry.js',
        'lib-demo': 'lib_demo@http://localhost:8083/remoteEntry.js'
        // 'studio-local-lib': 'studio_local_lib@http://localhost:8085/remoteEntry.js'
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
