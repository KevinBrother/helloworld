# vscode 编译器配置

## 安装插件

## 单个 cpp 文件编译

### 编译命令

``` bash
# 默认编译
g++ main.cpp # 会自动生成 a.exe
# 或
g++ main.cpp -o self-main # 指定输出文件名

# 生成可调试的执行文件
g++ -g main.cpp -o can-debug-main

```

### 配置 tasks.json

- 用来把 单个 cpp 文件编译成可执行文件

### 配置 launch.json

- 用来调试可执行文件
