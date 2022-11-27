import json from '@rollup/plugin-json';
// import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';
import del from 'rollup-plugin-delete';

export default {
  input: './src/main.js',
  /*   output: {
    format: 'cjs',
    dir: './dist'
  }, */
  output: [
    { dir: './dist', file: './dist/index.js', format: 'cjs' },
    {
      dir: './dist',
      file: './dist/index.esm.js',
      format: 'esm'
    },
    {
      dir: './dist',
      file: './dist/index.min.js',
      format: 'iife', // iife模式编译问题  https://github.com/henriquehbr/svelte-typewriter/issues/21
      name: 'version',
      // inlineDynamicImports: true,
      plugins: [terser()]
    }
  ],
  plugins: [del({ targets: 'dist/*' }), json()]
};
