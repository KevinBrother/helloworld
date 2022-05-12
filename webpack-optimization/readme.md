# 优化

## 01代码切割与压缩

- css、js、html

## 02 提起公共js库（react等第三方库不需要打包到业务的bundler文件中）

- cdn 或者提取到单独的vender文件夹中

## 03 代码分割（重复使用的组件提取出来，方便重复引用）

- html-webpack-externals-plugin基础包分离
- splitChunkPlugin

## 02 浏览器兼容

- css的浏览器兼容
