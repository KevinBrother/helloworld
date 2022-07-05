
import { createServer } from 'vite';

export const startServer = async (viteConfig) => {

  const server = await createServer(viteConfig);

  await server.listen();

  server.config.logger.info(`\n  vite  dev server running at:\n`, {
    clear: !server.config.logger.hasWarned
  });

  server.printUrls();

  return server.close.bind(server);
}