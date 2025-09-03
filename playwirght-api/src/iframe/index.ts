import { chromium, type Frame } from "playwright"; // Or 'chromium' or 'webkit'.

(async () => {
  const browser = await chromium.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.goto("https://www.google.com/chrome/browser/canary.html");

  page.getByText("Accept");
  page.mainFrame().getByText("Accept");

  dumpFrameTree(page.mainFrame(), "");
  await browser.close();

  function dumpFrameTree(frame: Frame, indent: string) {
    console.log(indent + frame.url());
    for (const child of frame.childFrames())
      dumpFrameTree(child, indent + "  ");
  }
})();
