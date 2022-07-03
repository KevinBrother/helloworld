import { defineConfig, mergeConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { createServer } from 'vite';
import * as path from 'path';

function getConfig() {
  return defineConfig({
    server: {},
    root: '',
    resolve: {
      alias: {
        // TODO App: path.resolve(__dirname, 'src/App.tsx')
        App: 'src/App.tsx'
      }
    },
    plugins: [svgr(), react()]
  });
}

export async function runViteServer() {
  // const viteConfig = generateViteConfig(config) as InlineConfig;

  const defaultConfig = {
    configFile: false
  };

  const viteConfig = mergeConfig(defaultConfig, getConfig());

  const server = await createServer(viteConfig);

  await server.listen();

  server.config.logger.info(`\n  vite  dev server running at:\n`, {
    clear: !server.config.logger.hasWarned
  });

  server.printUrls();

  return server.close.bind(server);
}

runViteServer();
