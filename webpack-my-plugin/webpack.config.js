const path = require('path');
const MyPlugin = require('./plugins/my-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js'
  },
  plugins: [new MyPlugin({ name: 'my-plugin' })]
};
