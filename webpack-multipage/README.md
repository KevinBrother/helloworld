# 多页面打包解决方案

## 多页面需要解决哪些方面

重要‼️：开发环境优化的方面和生产环境有一些不一样的地方，优化的不对反而会增加开发打包时间

- 通用的优化方案
  - [ ] 多线程构建
  - [ ] 开启缓存，两种模式处理方式不一样
  - [ ] 优化匹配，减少非必要的匹配项
  - [ ] 运行文件路径
  - [ ] 开发模式这些包可以不打包，而是直接走cdn，这样可以更快
  - [ ] 路由组件代码按需加载
  - [ ] 第三方组件库和插件，按需加载

- 只有开发环境相关的优化
  - 不要做提取公告库分包以及压缩相关的东西（费时间），应该考虑的是如何不处理公共库，减少生成bundle的时间
- 只有生产环境相关的优化
  - [x] css提取是否会提高开发环境的速度
  - [ ] 开发模式不需要压缩代码（压缩代码费时间）
  - [x] 提取公共代码（CommonsChunkPlugin）

- 其他待验证的方案

  - [ ] 重要‼️：devtools的选项
  - [ ] [常用webpack构建加速方案](https://blog.csdn.net/ch834301/article/details/113287010)
  - [ ] [html-webpack-plugin多页面中好像有很大的问题，只修改某个文件，他会处理其他页面的代码，使热更新优势变小](https://juejin.cn/post/6844903630340882446), 使用 [html-webpack-plugin-for-multihtml](html-webpack-plugin-for-multihtml)来优化, [其他多页面提速的思路](https://blog.csdn.net/weixin_39769703/article/details/110467730)
  - [ ] 待定：以webpack5的能力是否还需要 DllPlugin

- [ ] 常用库的单文件打包
  - [ ] antd
  - [ ] lodash
  - [ ] moment.js改为dayjs
  - [ ] monaco-editor

- [ ] 把config改为ts
- [ ] 其他多页面打包需要优化的方面
