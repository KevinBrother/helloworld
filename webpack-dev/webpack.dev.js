const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');
const glob = require('glob');

const getMultiPage = () => {
  const files = glob.sync(`${__dirname}/src/*/index.js`);
  const entryMap = {};
  const htmlWebpackPlugins = [];

  files.forEach((file) => {
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
  entry: entryMap,
  output: {
    filename: '[name]_[chunkhash:8].js',
    path: path.resolve(__dirname, 'dist')
  },
  devServer: {
    // static: __dirname + '/public'
    open: true,
    client: {
      overlay: {
        errors: true,
        warnings: false
      },
      progress: true
    }
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
  /*
 // TODO 2022年4月10日 12:14:00 resolve在开发模式下开启有bug！！！
 resolve: {
    extensions: ['.jsx']
  }, */

  // plugins: [].concat(htmlWebpackPlugins),
  plugins: [new ESLintPlugin(), new FriendlyErrorsWebpackPlugin()].concat(
    htmlWebpackPlugins
  ),
  devtool: 'source-map',
  stats: 'errors-only'
};
