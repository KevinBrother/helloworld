# webpack的配置学习案例


## 01 webpack默认的配置

## 02 多入口文件的的配置

## 03 loader的配置

常见loader

- babel-loader 转换es6、es7等JS新特性
- css-loader 支持.css文件的加载和解析
- less-loader 将less文件转换成css
- ts-loader 将TS转换成JS
- file-loader 进行图片、字体等的打包
- raw-loader 将文件以字符串的形式导入  
  - 可以解析.txt文件
- thread-loader 多进程打包JS和CSS

## tip: 目录结构的原因，webpack每次的build目录相对根路径是在package.json同层的，所以配置中的entry需要加上path的解析
