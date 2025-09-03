import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. 开始追踪（配置需要记录的内容）
  await context.tracing.start({
    screenshots: true,    // 记录每步操作的截图
    snapshots: true,      // 记录页面 DOM 快照（可回溯任意时刻的 DOM）
    sources: true         // 记录源代码（如 JS/CSS，便于调试）
  });

  // 2. 执行自动化操作（如导航、点击等）
  await page.goto('https://www.baidu.com');
  await page.fill('#kw', 'playwright tracing');
  await page.click('#su');
  await page.waitForLoadState('networkidle');

  // 3. 停止追踪并保存报告到本地（生成 .zip 文件）
  await context.tracing.stop({
    path: 'trace.zip'    // 保存路径，可自定义文件名
  });

  await browser.close();
})();
