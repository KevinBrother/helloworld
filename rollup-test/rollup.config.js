import json from '@rollup/plugin-json';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';

export default {
  input2: './src/main.js',
  output: {
    file: './dist/bundle.js',
    format: 'cjs'
  },
  plugins: [
    nodeResolve(),
    json(),
    commonjs(),
    babel({
      exclude: 'node_modules/**' // 只编译我们的源代码
    })
  ]
};
