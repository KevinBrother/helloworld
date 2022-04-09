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
