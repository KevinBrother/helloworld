
import { defineConfig, mergeConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

function presetConfig() {
  return defineConfig({
    server: {

    },
    root: '',
    resolve: {
      alias: {
        // TODO App: path.resolve(__dirname, 'src/App.tsx')
        App: 'src/App.tsx'
      }
    },
    plugins: [svgr(), react()]
  })
}

export function getConfig() {
  // const viteConfig = generateViteConfig(config) as InlineConfig;
  const defaultConfig = {
    configFile: false
  }

  const viteConfig = mergeConfig(defaultConfig, presetConfig());

  return viteConfig;
}