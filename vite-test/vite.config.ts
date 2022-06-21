import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      App: path.resolve(__dirname, 'src/App.tsx')
    }
  },
  plugins: [react()]
})
