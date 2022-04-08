# webpack的配置学习案例

why

- 为什么

what

- 是什么

how

- 怎么做

## 01 webpack默认的配置

如果入口文件解析依赖图谱，并输出文件到指定文件夹中

## 02 多入口文件的的配置

可以有多个依赖路径，解析成多个依赖图

## 03 loader的配置

why

- webpack默认只能解析JS和JSON其他的文件类型不能识别，需要通过loader来把其他的文件类型转换为有效的模块，并添加到依赖图中。

what

- 本省是一个函数，接受源文件作为参数，返回转换到结果。

how

- test 指定匹配规则， use指定使用的loader名称，（loader需要安装依赖，没用到可以不安装，即使写了也不会匹配到）
- 每一个匹配规则的loader从后往前调用，顺序不能颠倒，后面loader解析出来的内容给前一个loader使用，以此类推

常见loader

- babel-loader 转换es6、es7等JS新特性
- css-loader 支持.css文件的加载和解析
- less-loader 将less文件转换成css
- ts-loader 将TS转换成JS
- file-loader 进行图片、字体等的打包
- raw-loader 将文件以字符串的形式导入  
  - 可以解析.txt文件
- thread-loader 多进程打包JS和CSS // TODO 2022年4月8日 12:12:50 感觉这个很厉害

## 04 plugin

why

- loader只能解析和转换文件，还有生命周期级别的配置需要自定义配置
- 用于bundle文件的优化，资源管理和环境变量注入，作用与整个构建过程

what

- 是什么

how

- 怎么做

常见的plugin

- CommonsChunkPlugin 将chunks相同的模块代码提取成公共js
- CleanWebpackPlugin  清理构建目录 // webpack5 已移除，从output中直接clean为true就行
- MiniCssExtractPlugin  将CSS从bundle文件里提取成一个独立的CSS文件
- CopyWebpackPlugin 将文件或文件夹拷贝到构建的输出目录 
- HtmlWebpackPlugin 创建html文件去承载输出的bundle 可以默认生成，也可以通过template指定模板
- UglifyjsWebpackPlugin 压缩JS // TODO 2022年4月8日 15:02:00 没看出效果
- ZipWebpackPlugin 将打包出的资源生成一个zip包

## tip: webpack每次的build目录相对根路径是在package.json同层的，所以当前组织的目录结构，需要在配置中的entry需要加上path的解析
