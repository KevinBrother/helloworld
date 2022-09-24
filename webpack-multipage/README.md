# 多页面打包解决方案

## 多页面需要解决哪些方面

- [ ] [常用webpack构建加速方案](https://blog.csdn.net/ch834301/article/details/113287010)
  - [ ] 提取公共代码（CommonsChunkPlugin）
  - [ ] 开发模式不需要压缩代码（压缩代码费时间）
  - [ ] [html-webpack-plugin多页面中好像有很大的问题，只修改某个文件，他会处理其他页面的代码，使热更新优势变小](https://juejin.cn/post/6844903630340882446), 使用 [html-webpack-plugin-for-multihtml](html-webpack-plugin-for-multihtml)来优化, [其他多页面提速的思路](https://blog.csdn.net/weixin_39769703/article/details/110467730)
  - [ ] 开启缓存
  - [ ] 优化匹配，减少非必要的匹配项
  - [ ] 运行文件路径
  - [ ] 多线程构建
  - [ ] 开发模式这些包可以不打包，而是直接走cdn，这样可以更快
  - [ ] 待定：以webpack5的能力是否还需要 DllPlugin

- [ ] 代码方面
  - [ ] 路由组件代码按需加载
  - [ ] 第三方组件库和插件，按需加载

- [ ] 常用库的单文件打包
  - [ ] antd
  - [ ] lodash
  - [ ] moment.js改为dayjs
  - [ ] monaco-editor

- [ ] 把config改为ts

- [ ] 其他多页面打包需要优化的方面

