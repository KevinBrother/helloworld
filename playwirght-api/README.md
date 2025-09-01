# playwright-api

## [BrowserContext 的作用](https://playwright.dev/docs/api/class-browsercontext)

Browser contexts are used to isolate different sessions within a single browser instance. Each context can have its own cookies, cache, and other session data.

### 通过 browser.newPage() 与 context.newPage() 比较了理解其作用

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://example.com');
  await browser.close();
})();
```

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const options: BrowserContextOptions = {};
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.goto('https://example.com');
  await browser.close();
})();
```

- `browser.newPage()` 创建一个新的页面实例，属于浏览器的默认上下文, 所有通过 browser.newPage() 创建的页面，都会共享同一个默认上下文。因此这些页面会共享 cookies、localStorage、权限设置等状态（例如一个页面登录后，其他页面也会保持登录状态）。
- `context.newPage()` 创建一个新的页面实例，属于指定的浏览器上下文。通过 context.newPage() 创建的页面只会与同一上下文中的其他页面共享状态，而不会与浏览器的默认上下文或其他上下文中的页面共享状态。

curl "<https://r.jina.ai/https://rpa-docs.datagrand.com>" \
  -H "Authorization: Bearer jina_085b2f6f2a8f48e2a711585cdc4d2941Kc2TYVYCx1i2Ni0Ukl8lZJd_Q2aW"

## [Browser 和 BrowserServer](https://playwright.dev/docs/api/class-browserserver)

### Browser

``` typescript
// 浏览器实例
const browser = await chromium.launch({
  headless: true
});

// 可以手动关闭，也可以等待浏览器实例被垃圾回收
await browser.close();
```

- 进程内调用，无网络开销
- 随脚本结束自动关闭（除非设置 persistent: true）

### BrowserServer

``` typescript
// 创建方式
import { chromium } from 'playwright';
const browserServer = await chromium.launchServer({
  port: 9222, // 固定端口，方便客户端连接
  headless: true
});

// 需要手动关闭，否则会有进程残留
await browserServer.close();
```

- 远程浏览器服务: 在服务器上启动 BrowserServer，供本地或其他机器的脚本连接使用，适合 CI/CD 环境或跨设备测试。
- 多客户端共享浏览器：多个脚本可通过同一个 wsEndpoint 连接到同一浏览器进程，共享浏览器状态（如登录会话），节省资源。
- 进程隔离与稳定性保障：避免脚本崩溃导致浏览器进程异常退出，或浏览器崩溃影响脚本运行。
- 本质上是 Playwright 封装的、基于 CDP 的浏览器服务启动方式，会在后台启动一个 Chromium 浏览器进程，并自动开启 CDP 服务器模式。

## CDP(chrome-devtools-protocol)

``` bash
# 启动 chrome 浏览器的远程调试端口
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --remote-debugging-address=0.0.0.0

# 获取当前端口的 websocket 的地址
curl http://localhost:9222/json
```

## tracing
