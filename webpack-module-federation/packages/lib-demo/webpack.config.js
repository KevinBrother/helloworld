const { ModuleFederationPlugin } = require('webpack').container;
const path = require('path');
module.exports = {
  entry: './index.js',
  mode: 'development',
  devtool: 'hidden-source-map',
  output: {
    clean: true
  },
  module: {},
  plugins: [
    new ModuleFederationPlugin({
      name: 'lib_demo',
      filename: 'remoteEntry.js',
      exposes: {
        // './add': './src/add',
        './index': './index'
      }
    })
  ]
};
