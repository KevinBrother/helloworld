const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
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
  mode: 'production',
  entry: entryMap,
  output: {
    filename: '[name]_[chunkhash:8].js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      { test: /\.js|jsx$/, use: 'babel-loader' },
      {
        test: /\.(png|jpg|gif|svg)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name(resourcePath, resourceQuery) {
                if (process.env.NODE_ENV === 'development') {
                  return '[path][name].[ext]';
                }
                return '[name]-[hash:8].[ext]';
              }
            }
          }
        ]
      },
      {
        test: /\.less$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'less-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [require('autoprefixer')]
              }
            }
          },
          {
            loader: 'px2rem-loader',
            options: {
              remUni: 75,
              remPrecision: 8
            }
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.jsx']
  },
  devServer: {
    // static: __dirname + '/public'
  },
  optimization: {
    minimizer: [new CssMinimizerPlugin()],
    splitChunks: {
      cacheGroups: {
        commons: {
          // test: /(react|react-dom)/,
          minChunks: 2,
          name: 'vendor',
          chunks: 'all'
        }
      }
    }
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: '[name]_[contenthash:8].css' }),
    new CleanWebpackPlugin()
  ].concat(htmlWebpackPlugins),
  devtool: 'source-map'
};
