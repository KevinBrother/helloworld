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
