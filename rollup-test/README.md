# rollup

## 属性

- 必须属性
  - input、output的file和format

## 插件

- rollup-plugin-node-resolve:用来解析node的导入
- rollup-plugin-commonjs: 把cjs转为esm

## Q

- mjs不能导入json文件，
  - node  --experimental-json-modules XXX.mjs

- when building multiple chunks, the "output.dir" option must be used, not "output.file". To inline dynamic imports, set the "inlineDynamicImports" option. 
 应该是有动态导入准备切割为多个chunks，所有需要添加一个 行内动态导入  {inlineDynamicImports: true}
<https://github.com/rollup/rollup/issues/2616>
