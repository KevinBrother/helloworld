import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 初始化vite的react配置
export default defineConfig({
  server: {
    open: true,
  },
  esbuild: {
    loader: 'jsx'
  },
  plugins: [react()]
})