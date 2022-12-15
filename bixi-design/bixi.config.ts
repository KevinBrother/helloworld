import { defineConfig } from '@bixi-design/builder';
import path from 'path';

export default defineConfig({
  title: 'bixi-design',
  copy: [
    {
      from: 'src/assets',
      to: 'assets'
    }
  ],

  /*   "@bixi-design/builder": "2.2.6-alpha.19",
    "@bixi-design/cli": "2.2.6-alpha.19",
    "@bixi-design/lint": "2.2.6-alpha.19",
    "@bixi-rpa/core": "2.0.3-alpha.51", */

  replaceMomentWithDayjs: false,
  server: {
    host: 'localhost',
    static: { directory: path.join(__dirname, 'src/assets') },
    port: 4011,
    proxy: {
      '/v3': {
        target: 'https://rpa-test.datagrand.com',
        changeOrigin: true,
        secure: false
      },
      '/api': {
        target: 'https://yapi.datagrand.com/mock/30/',
        changeOrigin: true
      },
      '/yapi': {
        target: 'https://yapi.datagrand.com/mock/1519/',
        changeOrigin: true,
        pathRewrite: { '^/yapi': '' }
      }
    }
  },
  define: {
    // 只有以 RPA_ 前缀开头的配置才会暴露给客户端
    __APP_ENV__: 'RPA_'
  }
});
