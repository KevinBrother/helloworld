const path = require('path');
const ZipPlugin = require('./plugins/zip-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    filename: 'main.js'
  },
  plugins: [new ZipPlugin({ filename: 'offline' })]
};
