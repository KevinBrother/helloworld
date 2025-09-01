import { chromium } from "playwright";
import wsData from "../ws.json" with {type: 'json'};

// 客户端脚本：连接到 BrowserServer
async function connectToBrowserServer() {
  // 1. 填入 BrowserServer 的 wsEndpoint（需替换为实际地址）
  const wsEndpoint = wsData.wsUrl;

  // 2. 连接到远程浏览器
  const browser = await chromium.connect(wsEndpoint, {
    // 可选配置：超时时间、是否忽略 HTTPS 错误等
    timeout: 30000
  });

  // 3. 连接成功后，即可像使用本地浏览器一样操作
  const page = await browser.newPage();

  await page.goto("https://example.com");
  console.log("页面标题:", await page.title());

  // 4. 使用完毕后关闭连接（可选，不影响 BrowserServer 本身）
  await browser.close();
}

connectToBrowserServer();
