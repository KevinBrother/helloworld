import json from '@rollup/plugin-json';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';

export default {
  input2: './src/main.js',
  /*   output: [
    {
      file: './dist/bundle.js',
      format: 'cjs'
    },
    {
      file: './dist/bundle.min.js',
      format: 'iife',
      name: 'version',
      plugins: [terser()]
    }
  ], */
  output: {
    dir: './dist',
    format: 'cjs',
    inlineDynamicImports: true
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
