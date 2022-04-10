const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'none',
  entry: {
    add: './src/index.js',
    'add.min': './src/index.js'
  },
  output: {
    filename: '[name].js',
    library: {
      name: 'add',
      type: 'umd',
      export: 'default'
    }
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        test: /\.min\.js$/
      })
    ]
  },
  devtool: 'source-map'
};
