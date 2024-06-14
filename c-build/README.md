# 操作手册

## 基本操作

1. 编写 CMakeLists.txt 文件

2. 调用 cmake 会根据 CMakeLists.txt 生成 Makefile

``` bash
    cmake -DCMAKE_BUILD_TYPE=Debug -DCMAKE_MAKE_PROGRAM=ninja -G Ninja -S . -B cmake-build-debug
    cd c-build && cmake . -B cmake-build-debug  # 生成构建项目文件 build tree/binary tree, 并把构建结果输出到 cmake-build-debug 目录下
    # window 如果装了 vs 默认会使用 vs 编译器 可以使用 -G 指定 mingw 或 ninja 编译器
    cmake -G "MinGW Makefiles" -S . -B cmake-build-debug
```

3. 调用 make 会根据 Makefile 编译生成可执行文件

``` bash
cmake --build .  # - 执行当前目录下的构建系统，生成构建目标 
# 或者 上面的命令 支持跨平台，所以建议使用上面的命令
make
```

4. 运行可执行文件

``` bash
./bin/helloCMake
```

## 工程操作
[CMake 工程教程](https://blog.csdn.net/kaizi318/article/details/7721624)

# 参考文档

[MacOS使用CMake](https://zhuanlan.zhihu.com/p/571647419)
[Modern CMake 简体中文版](https://modern-cmake-cn.github.io/Modern-CMake-zh_CN/)
