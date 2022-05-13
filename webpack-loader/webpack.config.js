module.exports = {
  entry: {
    src: './src/index.js'
  },
  module: {
    rules: [
      {
        test: /.js$/,
        use: ['./loaders/a-loader.js', './loaders/b-loader.js']
      }
    ]
  }
};
