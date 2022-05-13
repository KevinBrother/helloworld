# webpack 源码、自定义loader、plugin

## `loader-runner`可以在没有webpack环境下调试loader，效率更高。其实webpack底层使用的也是loader-run来控制loader的执行

## loader中定义的option可以通过`loader-utils`的`getOption`方法获取