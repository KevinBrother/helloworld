import { chromium, firefox, webkit } from "playwright";

(async () => {
  const browser = await chromium.launch(); // Or 'firefox' or 'webkit'.

  const page = await browser.newPage();

  const rsp = await page.goto("http://example.com");
  // console.log('rsp', rsp)
  const body = await rsp?.body();
  console.log("resp.body()", body.toString());
  // other actions...
  await browser.close();
})();
