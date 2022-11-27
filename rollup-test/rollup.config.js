import json from '@rollup/plugin-json';
// import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';
import del from 'rollup-plugin-delete';
import css2 from './plugins/rollup-plugin-css2';

export default {
  input: './src/main.js',
  /*   output: {
    format: 'cjs',
    dir: './dist'
  }, */
  output: [
    {
      file: './dist/index.js',
      format: 'cjs',
      inlineDynamicImports: true
    },
    {
      file: './dist/index.esm.js',
      format: 'esm',
      inlineDynamicImports: true
    },
    {
      file: './dist/index.min.js',
      inlineDynamicImports: true,
      format: 'iife',
      name: 'version',
      plugins: [terser()]
    }
  ],
  plugins: [json(), del({ targets: ['dist/*'] }), css2()]
};
