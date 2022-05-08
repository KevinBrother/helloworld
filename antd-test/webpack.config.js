const { resolve } = require('path');

module.exports = {
  mode: 'production',
  entry: resolve(__dirname, './src/index.tsx'),
  context: resolve(__dirname, './'),
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
      {
        test: /\.svg$/,
        include: [resolve(__dirname, 'src/assets/icons')],
        use: {
          loader: 'svg-sprite-loader',
          options: {
            name: '[name]',
            prefixize: true
          }
        }
      },
      { test: /\.(png|jpg|gif|svg)$/, use: ['file-loader'] },
      { test: /\.(woff|woff2|eot|ttf|otf)$/, use: ['file-loader'] }
      /*   {
        test: /\.(jpg|png|gif|jpeg)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024
          }
        },
        generator: {}
      } */
    ]
  },
  resolve: {
    alias: {
      '@router': resolve(__dirname, './src/router'),
      '@src': resolve(__dirname, './src'),
      '@assets': resolve(__dirname, './src/assets'),
      '@utils': resolve(__dirname, './src/utils'),
      '@stores': resolve(__dirname, './src/stores'),
      '@components': resolve(__dirname, 'src/components'),
      '@constants': resolve(__dirname, 'src/constants'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@layouts': resolve(__dirname, 'src/layouts'),
      '@models': resolve(__dirname, 'src/models'),
      '@monitors': resolve(__dirname, 'src/monitors'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@services': resolve(__dirname, 'src/services'),
      '@styles': resolve(__dirname, 'src/styles')
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  }
};
