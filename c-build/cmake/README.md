# 工程化操作

## 进度到当前目录

1. 生成 Makefile

``` bash
    cmake .. 
    # 会在build 目录下生成 相应的 Makefile 文件
```

2. 生成可执行文件

``` bash
    make
    # 会在 build/bin 目录下生成可执行文件
```

3. 运行可执行文件

``` bash
    ./bin/helloCMake.exe
```

## 扩展

1. 使用 ninja 生成器 (需要把其他生成器生成的文件删除)

``` bash
    cmake -G "Ninja" ..
    # 会在 build 目录下生成 相应的 Ninja 文件
    ninja
    # 会在 build/bin 目录下生成可执行文件
    ./bin/helloCMake.exe
```