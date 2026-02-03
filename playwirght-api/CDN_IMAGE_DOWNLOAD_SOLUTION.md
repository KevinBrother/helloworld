# Playwright 下载 CDN 图片的最小配置

## 问题描述

使用 Playwright 下载 `syhuade.com` 网站图片时，CDN (yun300.cn) 返回 **567 状态码**导致图片下载失败。

## 最小必要配置

经过测试，只需要**一个配置**即可成功下载：

### ✅ 唯一必须的配置

```typescript
const context = await browser.newContext({
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
});
```

**为什么必须**:
- 没有 userAgent：图片文件是 "ASCII text"（错误页），不是真正的图片
- 有 userAgent：图片是有效的 JPEG/PNG 文件

### ❌ 不需要的配置

| 配置 | 需要? | 测试结果 |
|------|--------|----------|
| serviceWorkers: "block" | ❌ | 去掉后仍能下载 21 张图片 |
| viewport | ❌ | 去掉后仍能下载 21 张图片 |
| 先访问主页 | ❌ | 直接访问目标页即可 |
| waitUntil: "networkidle" | ❌ | domcontentloaded + 2秒 等待即可 |
| 3 秒等待 | ❌ | 2 秒等待即可获取全部图片 |

## 完整最小代码

```typescript
import { chromium } from "playwright";
import { promises as fs } from "fs";
import { join } from "path";

(async () => {
  const browser = await chromium.launch();

  // 唯一必须的配置
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();
  const resources: any[] = [];
  const seenUrls = new Set<string>();

  page.on("response", async (response) => {
    const url = response.url();
    const resourceType = response.request().resourceType();

    // 过滤不需要的资源
    if (resourceType === "script") return;
    if (resourceType === "ping") return;
    if (resourceType === "image" && url.includes(".svg")) return;
    if (!url.startsWith("http")) return;
    if (seenUrls.has(url)) return;

    seenUrls.add(url);

    const buffer = await response.body();
    resources.push({
      url,
      type: resourceType,
      buffer: Buffer.from(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
    });
  });

  // 加载页面
  await page.goto("http://syhuade.com/product/55.html", { waitUntil: "domcontentloaded" });
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 保存文件
  const outputDir = join(process.cwd(), "output");
  for (const [i, resource] of resources.entries()) {
    if (resource.buffer) {
      const typeDir = join(outputDir, resource.type);
      await fs.mkdir(typeDir, { recursive: true });
      await fs.writeFile(join(typeDir, `${i}-${resource.url.split("/").pop()}`), resource.buffer);
    }
  }

  console.log(`保存 ${resources.filter(r => r.buffer).length} 个文件`);

  await browser.close();
})();
```

## 测试对比

| 配置 | 图片数量 | 图片有效性 |
|------|----------|-----------|
| 有 userAgent | 21 张 | ✅ 有效 JPEG/PNG |
| 无 userAgent | 18 张 | ❌ ASCII text (错误页) |

## 总结

**唯一关键配置**: `userAgent`

CDN 的保护机制主要通过 User-Agent 检测来实现。使用真实浏览器的 User-Agent 即可绕过限制，无需其他复杂配置。



### Hi there 👋

- ✏️ Read my blog on https://zu1k.com
- 📫 How to reach me: i@zu1k.com

### Recent Posts
<!-- BLOG-POST-LIST:START -->
- [从 ASAN Stuck 到 Open Files Limit](https://zu1k.com/)
- [谈谈 Mastodon、Fediverse 和 ActivityPub](https://zu1k.com/)
- [IPFS 日用优化指南](https://zu1k.com/)
- [谁不想要 2^64 个 IP 的代理池 ？](https://zu1k.com/)
- [DeepL Api 设计中的欺骗战术](https://zu1k.com/)
<!-- BLOG-POST-LIST:END -->

### GitHub Stats

![zu1k's GitHub Stats](github-stats.svg)

![zu1k's GitHub Trophies](github-trophy.svg)

<div>
  <img src="github-stats-full.svg" />
  <img src="github-langs.svg" />
</div>

