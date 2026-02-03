import { chromium } from "playwright";
import { promises as fs } from "fs";
import { join } from "path";

interface ResourceInfo {
  url: string;
  type: string;
  buffer?: Buffer;
}

// 从 URL 生成文件名（移除扩展名）
function getFilename(url: string, index: number): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split("/").pop() || `file-${index}`;
    const nameWithoutExt = filename.replace(/\.[^.]+$/, "");
    return `${index}-${nameWithoutExt}`;
  } catch {
    return `file-${index}`;
  }
}

// 获取文件扩展名
function getExtension(url: string, resourceType: string): string {
  const match = url.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp|css|html|json|woff2?|ttf|mp4|pdf)(?:\?|$)/);
  if (match) return `.${match[1]}`;

  const defaults: Record<string, string> = {
    document: ".html",
    stylesheet: ".css",
    image: ".png",
    font: ".woff2",
    xhr: ".json",
    media: ".mp4",
  };
  return defaults[resourceType] || ".bin";
}

// 保存资源
async function saveResource(resource: ResourceInfo, index: number, outputDir: string): Promise<void> {
  if (!resource.buffer) return;
  const typeDir = join(outputDir, resource.type);
  await fs.mkdir(typeDir, { recursive: true });
  const baseName = getFilename(resource.url, index);
  const ext = getExtension(resource.url, resource.type);
  await fs.writeFile(join(typeDir, `${baseName}${ext}`), resource.buffer);
}

(async () => {
  const browser = await chromium.launch();

  // ✅ 必须配置: 真实 User-Agent
  const context = await browser.newContext({
    // userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();
  const resources: ResourceInfo[] = [];
  const seenUrls = new Set<string>();

  // 监听响应
  page.on("response", async (response) => {
    const url = response.url();
    const resourceType = response.request().resourceType();

    // 过滤: SVG、非 http 协议、script、ping
    if (resourceType === "image" && url.toLowerCase().includes(".svg")) return;
    if (!url.startsWith("http")) return;
    if (resourceType === "script") return;
    if (resourceType === "ping") return;
    if (seenUrls.has(url)) return;

    seenUrls.add(url);

    try {
      const buffer = await response.body();
      resources.push({
        url,
        type: resourceType,
        buffer: Buffer.from(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
      });
    } catch {
      resources.push({ url, type: resourceType });
    }
  });

  console.log("正在加载页面...");
  await page.goto("http://syhuade.com/product/55.html", { waitUntil: "domcontentloaded" });
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 保存资源
  const outputDir = join(process.cwd(), "output");
  let savedCount = 0;
  for (const resource of resources) {
    try {
      await saveResource(resource, savedCount, outputDir);
      savedCount++;
    } catch {
      // 忽略保存失败
    }
  }

  // 统计
  const typeCount: Record<string, number> = {};
  resources.forEach(r => { typeCount[r.type] = (typeCount[r.type] || 0) + 1; });
  const validCount = resources.filter(r => r.buffer).length;

  console.log(`\n成功捕获 ${resources.length} 个资源，保存 ${savedCount} 个文件`);
  console.log(`有效内容: ${validCount} 个`);
  console.log(`类型分布:`, JSON.stringify(typeCount, null, 2));

  await browser.close();
})();
