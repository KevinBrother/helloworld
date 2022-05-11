const { resolve } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const BundleAnalyzerPlugin =
  require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');

const smp = new SpeedMeasurePlugin();

module.exports = smp.wrap({
  mode: 'production',
  entry: resolve(__dirname, './src/index.tsx'),
  output: {
    clean: true
  },
  module: {
    rules: [
      { test: /\.(ts|tsx)$/, use: 'babel-loader' },
      { test: /\.txt$/, use: 'raw-loader' },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      {
        test: /\.less$/,
        use: ['style-loader', 'css-loader', 'less-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx']
  },
  plugins: [
    new HtmlWebpackPlugin({ template: resolve(__dirname, './index.html') }),
    new BundleAnalyzerPlugin({ analyzerPort: 'auto' })
  ]
});
