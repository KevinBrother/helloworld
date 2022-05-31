import json from '@rollup/plugin-json';
// import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';

export default {
  input: './src/main.js',
  /*   output: {
    format: 'cjs',
    dir: './dist'
  }, */
  output: [
    {
      dir: './dist',
      format: 'cjs'
    },
    {
      file: './dist/bundle.min.js',
      format: 'iife',
      name: 'version',
      plugins: [terser()]
    }
  ],
  plugins: [json()]
};
