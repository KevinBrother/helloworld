const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const glob = require('glob');

const getMultiPage = function () {
  const files = glob.sync(__dirname + '/src/*/index.js');
  const entryMap = {};
  const htmlWebpackPlugins = [];

  files.forEach(function (file) {
    const match = file.match(/\/src\/(.*)\/index.js/);
    const pageName = match[1];
    // 生成entry
    entryMap[pageName] = file;
    // 生成多个htmWebpackPlugin
    htmlWebpackPlugins.push(
      new HtmlWebpackPlugin({
        // scriptLoading: 'module',
        template: `./public/${pageName}.html`,
        filename: `${pageName}.html`,
        chunks: [pageName]
      })
    );
  });

  return { entryMap, htmlWebpackPlugins };
};

const { entryMap, htmlWebpackPlugins } = getMultiPage();

module.exports = {
  mode: 'development',
  entry: './src/bar/index.js',
  output: {
    filename: '[name]_[chunkhash:8].js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      { test: /\.js|jsx$/, use: 'babel-loader' },
      {
        test: /\.(png|jpg|gif|svg)$/,
        use: ['file-loader']
      },
      {
        test: /\.less$/,
        use: ['style-loader', 'css-loader', 'less-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.jsx']
  },
  devServer: {
    // static: __dirname + '/public'
    hot: true
  },
  // plugins: [].concat(htmlWebpackPlugins),
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/bar.html',
      filename: 'bar.html'
    })
  ],
  devtool: 'source-map'
};
