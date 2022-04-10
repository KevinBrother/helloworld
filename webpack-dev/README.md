# 实际配置

## HMR

使用webpack-dev-server

## 文件指纹

- hash 和整个项目的构建有关，一个文件变了，整个项目的hash值都会变 （图片、字体文件使用-file-loader）
- chunkhash 和webpack打包的chunk有关，不同的entry会生成不同的chunkhash （js使用 output 指定即可）
- contenthash 更具文件内容来定义hash，文件内容不变，contenthash不变 （css使用 MiniCssExtractPlugin）
- 为什么css要用contenthash，因为如果使用chunkhash的话，js内容变了，css内容，打包的时候css的chunkhash也会变化，没有必要
- 为什么js不用contenthash呢？ // TODO 2022年4月9日 21:53:25

## html、css、js压缩

html使用html-webpack-plugin
js webpack自带来ugliyjs
css 使用 css-minimizer-webpack-plugin

## postcss与autoprefixer自动补全CSS3前缀

`yarn add -D postcss-loader autoprefixer -D`

## 移动端CSS px 自动转换成rem

`yarn add -D px2rem-loader lib-flexible raw-loader -D`
px2rem-loader
lib-flexible:页面渲染时计算根元素的font-size值，需要配合raw-loader加载静态资源直接放到html的文件头部中

## 静态资源内联

raw-loader 需要使用0.5.1版本的，高版本的有问题,它不能直接从node-modules中加载js

## 多页面打包

每次都需要手动配置entry和htmlWebpackPlugin太过繁琐，可以使用一定的文件组织方式，配合glob库提取文件，动态生成

## sourcemap

打包后的js经过压缩不好定位bug调试，需要生成对应的sourcemap匹配错误

## 提取页面公共资源

通过内置的splitChunks,可以把重复使用的功能单独抽离出来 // TODO 2022年4月10日 13:55:04 公共的资源太多怎么再抽离出chunk呢？按需加载？

## [Tree Shaking](https://juejin.cn/post/7004297344300777502)

- 利用es6模块系统，删除⽆⽤代码
- 必须是es6语法，cmj的不支持
- 函数不能有副作用
- minimizer中默认是配置了js的压缩，但是如果配置了css的压缩就需要手动的安装terser-webpack-plugin再配置js压缩

## 作用域提升 · Scope Hoisting

webpack 默认会用大量的闭包来包裹函数和引入，通过scope hoisting能大大减少这种代码

## 代码分割

