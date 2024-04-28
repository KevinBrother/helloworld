# C++编写node 的扩展文件

1. 编写完扩展后，您需要使用 Node.js 的 node-gyp 工具来构建扩展。首先，创建一个名为 binding.gyp 的构建文件。
2. 然后在命令行中执行以下命令: 会生成 build 目录，以及最后的 addon.node 文件。

``` bash
node-gyp configure
node-gyp build
```

3. 创建 js 文件直接引入 addon.node 文件，并调用其方法。

4. 运行

``` bash
node index.cjs
```
