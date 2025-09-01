import { chromium } from "playwright";
import wsData from "../ws.json" with {type: 'json'};

// 客户端脚本：连接到 BrowserServer
async function connectToCDP() {
  // 1. 填入 BrowserServer 的 wsEndpoint（需替换为实际地址）
  const wsEndpoint = wsData.wsUrl;

  // 2. 连接到远程浏览器
  const browser = await chromium.connect(wsEndpoint, {
    // 可选配置：超时时间、是否忽略 HTTPS 错误等
    timeout: 30000,
  });

  // 高亮
  const page = await browser.newPage();
  await page.goto("https://www.baidu.com");
  await page.locator('//*[@id="s-top-left"]/a[6]').highlight();
}

connectToCDP();
