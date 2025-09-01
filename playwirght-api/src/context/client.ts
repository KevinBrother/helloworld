import { chromium, type Browser } from "playwright";
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

  const page = await browser.newPage();
  await page.goto("https://www.baidu.com");

  const page2 = await browser.newPage();
  await page2.goto("https://www.baidu.com");

  const page3 = await browser.newPage();
  await page3.goto("https://www.baidu.com");

  console.log("browser.contexts().length", browser.contexts().length);
  console.log(
    "browser.contexts[0].pages",
    browser.contexts()[0]?.pages().length
  );
}

connectToCDP();
