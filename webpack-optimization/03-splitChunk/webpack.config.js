const { resolve } = require('path');
const getBaseConfig = require('../webpack.base.config');
const { merge } = require('webpack-merge');
const HtmlWebpackExternalsPlugin = require('html-webpack-externals-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = merge(getBaseConfig(__dirname), {
  entry: {
    first: resolve(__dirname, './src/first.tsx'),
    second: resolve(__dirname, './src/second.tsx')
  },

  optimization: {
    /*   
    // 01、
    // 有chunks的值区分切分类型，
    // 再按照minSize，根据module决定，来切割chunk。而不是只更具文件大小。
    splitChunks: {
      chunks: 'all',
      minSize: 0,
      minChunks: 1
    }
 */

    // 02 第三方模块的切分
    splitChunks: {
      cacheGroups: {
        reactDom: {
          test: /react-dom/,
          name: 'react-dom',
          chunks: 'all',
          priority: -10
        },
        react: {
          test: /react/,
          name: 'react',
          chunks: 'all',
          priority: -20
        },
        echarts: {
          test: /echarts/,
          name: 'echarts',
          chunks: 'all',
          priority: -20
        },
        common: {
          name: 'common',
          minSize: 0,
          minChunks: 1,
          chunks: 'all',
          priority: -30
        }
      }
    }
    /*    splitChunks: {
      cacheGroups: {
        common: {
          name: 'common',
          minSize: 0,
          minChunks: 1,
          chunks: 'all'
        }
      }
    } */

    /*  splitChunks: {
      minSize: 0,
      cacheGroups: {
        defaultVendors: {
          test: function (module, chunk) {
            console.log('module 1', module.resource);
            return /[\\/]node_modules[\\/]/.test(module.resource);
          }, //符合组的要求就给构建venders
          priority: -10, //优先级用来判断打包到哪个里面去
          name: 'vendors' //指定chunks名称
        },
        dll: {
          test: function (module, chunk) {
            console.log('module2', module.resource);
            return (
              module.resource &&
              module.resource.endsWith('.js') &&
              module.resource.includes(`react`)
            );
          }, //符合组的要求就给构建venders
          priority: -5, //优先级用来判断打包到哪个里面去
          name: 'dll', //指定chunks名称
          minChunks: 1
        }
      }
    } */
  },
  stats: {
    ids: true
  }
});
