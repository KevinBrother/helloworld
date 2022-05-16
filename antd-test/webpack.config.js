const HtmlWebpackExternalsPlugin = require('html-webpack-externals-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { resolve } = require('path');

module.exports = {
  mode: 'production',
  entry: resolve(__dirname, './src/index.tsx'),
  module: {
    rules: [
      {
        test: /\.js|.ts|tsx$/,
        use: 'babel-loader'
      },
      {
        test: /\.(c|le)ss$/i,
        use: [
          // compiles Less to CSS
          'style-loader',
          'css-loader',
          {
            loader: 'less-loader',
            options: {
              lessOptions: {
                javascriptEnabled: true
              }
            }
          }
        ]
      },
      { test: /\.(png|jpg|gif|svg)$/, use: ['file-loader'] },
      { test: /\.(woff|woff2|eot|ttf|otf)$/, use: ['file-loader'] }
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        common: {
          name: 'common',
          minSize: 0,
          minChunks: 1,
          chunks: 'all'
        }
      }
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: resolve(__dirname, './public/index.html')
    }),
    new HtmlWebpackExternalsPlugin({
      externals: [
        // CDN的方式
        {
          module: 'react',
          entry: 'https://unpkg.com/react@17.0.1/umd/react.production.min.js',
          global: 'React'
        },
        {
          module: 'react-dom',
          entry:
            'https://unpkg.com/react-dom@17.0.1/umd/react-dom.production.min.js',
          global: 'ReactDOM'
        }
      ]
    })
  ],
  stats: {
    ids: true
  }
};
