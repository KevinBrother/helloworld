
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { chromium, firefox, webkit } from "playwright";

// 服务器端：启动浏览器服务并暴露 WebSocket 端点
const browserServer = await chromium.launchServer({
  port: 9222, // 固定端口，方便客户端连接
  headless: false
});

console.log('WebSocket 地址:', browserServer.wsEndpoint()); 
// 输出：ws://127.0.0.1:9222/devtools/browser/xxx


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wsUrl = browserServer.wsEndpoint();
const wsData = {
  wsUrl
};

const wsJson = JSON.stringify(wsData, null, 2);

fs.writeFileSync(path.resolve(__dirname, "../ws.json"), wsJson);
