
// import path from 'node:path/win32';

import path from 'path';
import { createServer, InlineConfig } from 'vite';

export async function runViteServer() {
  // const viteConfig = generateViteConfig(config) as InlineConfig;

  const viteConfig: InlineConfig = {
    configFile: './vite.config.ts'
  }

  const server = await createServer(viteConfig);

  await server.listen();

  /*   server.config.logger.info(`\n  vite v${require('vite/package.json').version}  dev server running at:\n`, {
      clear: !server.config.logger.hasWarned
    }); */
  server.config.logger.info(`\n  vite  dev server running at:\n`, {
    clear: !server.config.logger.hasWarned
  });

  server.printUrls();

  return server.close.bind(server);
}

runViteServer()