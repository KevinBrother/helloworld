import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();

  // 1. 配置视频录制（在上下文级别启用）
  const context = await browser.newContext({
    recordVideo: {
      dir: "./dist/", // 视频保存目录（需提前创建）
      size: { width: 1280, height: 720 }, // 可选：指定视频分辨率
    },
  });

  const page = await context.newPage();

  console.log("page.video().path() ", await page.video()?.path());

  // 2. 执行自动化操作（操作会被实时录制）
  await page.goto("https://www.baidu.com");
  await page.fill("#kw", "playwright video");
  await page.click("#su");
  await page.waitForLoadState("networkidle");

  // 3. 关闭上下文时，视频会自动保存到指定目录
  await context.close();
  await browser.close();
})();
