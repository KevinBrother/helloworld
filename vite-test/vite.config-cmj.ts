const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')
const svgr = require('vite-plugin-svgr')
const path = require('path')

// https://vitejs.dev/config/
module.exports = defineConfig({
  resolve: {
    alias: {
      App: path.resolve(__dirname, 'src/App.tsx')
    }
  },
  plugins: [svgr.default(), react()]
})
