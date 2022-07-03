// import path from 'node:path/win32';

import path from 'path';
import { createServer } from 'vite';

export async function runViteServer() {
  // const viteConfig = generateViteConfig(config) as InlineConfig;

  const viteConfig = {
    configFile: './vite.config.ts'
  };

  const server = await createServer(viteConfig);

  await server.listen();

  server.config.logger.info(`\n  vite  dev server running at:\n`, {
    clear: !server.config.logger.hasWarned
  });

  server.printUrls();

  return server.close.bind(server);
}

runViteServer();
