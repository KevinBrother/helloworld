
import { genHtml } from '../utils/genHtml';
import { getConfig } from '../utils/getConfig';
import { startServer } from '../utils/startServer';

function run() {
  genHtml();
  const viteConfig = getConfig()
  startServer(viteConfig);
}

run();
