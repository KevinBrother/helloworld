import { Test, TestingModule } from "@nestjs/testing";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ContentExtractorService } from "./content-extractor.service";

describe("ContentExtractorService", () => {
  let service: ContentExtractorService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [ContentExtractorService],
    }).compile();

    service = module.get<ContentExtractorService>(ContentExtractorService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe("基础功能测试", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });
  });

  describe("内容提取测试", () => {
    it("应该能够提取基本页面内容", () => {
      const html = `
        <html>
          <head>
            <title>测试页面</title>
            <meta name="description" content="这是一个测试页面">
            <meta name="keywords" content="测试,页面,内容">
            <meta name="author" content="测试作者">
          </head>
          <body>
            <main>
              <h1>主标题</h1>
              <p>这是主要内容段落。</p>
              <a href="/page1">内部链接</a>
              <a href="https://external.com">外部链接</a>
            </main>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com");

      expect(result.title).toBe("测试页面");
      expect(result.content).toContain("主标题");
      expect(result.content).toContain("这是主要内容段落");
      expect(result.links).toContain("https://example.com/page1");
      expect(result.links).not.toContain("https://external.com");
      expect(result.metadata.description).toBe("这是一个测试页面");
      expect(result.metadata.keywords).toBe("测试,页面,内容");
      expect(result.metadata.author).toBe("测试作者");
    });

    it("应该能够处理没有title标签的页面", () => {
      const html = `
        <html>
          <head>
            <title>测试页面</title>
            <meta property="og:title" content="OG标题">
          </head>
          <body>
            <h1>H1标题</h1>
            <p>内容</p>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com");

      expect(result.title).toBe("测试页面");
    });

    it("应该能够使用h1作为标题备选", () => {
      const html = `
        <html>
          <body>
            <h1>H1标题</h1>
            <p>内容</p>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com");

      expect(result.title).toBe("H1标题");
    });

    it("应该能够处理没有任何标题的页面", () => {
      const html = `
        <html>
          <body>
            <p>只有内容，没有标题</p>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com");

      expect(result.title).toBe("无标题");
    });
  });

  describe("主要内容提取测试", () => {
    it("应该能够从main标签提取内容", () => {
      const html = `
        <html>
          <body>
            <nav>导航内容</nav>
            <main>
              <h1>主要内容</h1>
              <p>这是主要段落。</p>
            </main>
            <footer>页脚内容</footer>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com");

      expect(result.content).toContain("主要内容");
      expect(result.content).toContain("这是主要段落");
      expect(result.content).not.toContain("导航内容");
      expect(result.content).not.toContain("页脚内容");
    });

    it("应该能够从article标签提取内容", () => {
      const html = `
        <html>
          <body>
            <article>
              <h2>文章标题</h2>
              <p>文章内容段落。</p>
            </article>
            <aside>侧边栏内容</aside>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com");

      expect(result.content).toContain("文章标题");
      expect(result.content).toContain("文章内容段落");
      expect(result.content).not.toContain("侧边栏内容");
    });

    it("应该能够从.content类选择器提取内容", () => {
      const html = `
        <html>
          <body>
            <div class="content">
              <h2>内容区域标题</h2>
              <p>内容区域段落。</p>
            </div>
            <div class="sidebar">侧边栏</div>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com");

      expect(result.content).toContain("内容区域标题");
      expect(result.content).toContain("内容区域段落");
      expect(result.content).not.toContain("侧边栏");
    });

    it("应该能够从markdown-body类提取内容", () => {
      const html = `
        <html>
          <body>
            <div class="markdown-body">
              <h1>Markdown内容</h1>
              <p>这是markdown渲染的内容。</p>
            </div>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com");

      expect(result.content).toContain("Markdown内容");
      expect(result.content).toContain("这是markdown渲染的内容");
    });

    it("应该能够移除脚本和样式标签", () => {
      const html = `
        <html>
          <head>
            <style>body { color: red; }</style>
          </head>
          <body>
            <main>
              <h1>主要内容</h1>
              <script>console.log('script');</script>
              <p>段落内容</p>
            </main>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com");

      expect(result.content).toContain("主要内容");
      expect(result.content).toContain("段落内容");
      expect(result.content).not.toContain("color: red");
      expect(result.content).not.toContain("console.log");
    });

    it("应该能够处理内容长度不足的情况", () => {
      const html = `
        <html>
          <body>
            <main>
              <h1>短</h1>
            </main>
            <div class="content">
              <h2>也很短</h2>
            </div>
            <div>
              <h1>这是一个足够长的内容区域，应该被选中作为主要内容，因为它包含了更多的文本内容。</h1>
              <p>这里有更多的段落内容，使得整个区域的文本长度超过了100个字符的阈值。</p>
            </div>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com");

      expect(result.content).toContain("这是一个足够长的内容区域");
      expect(result.content).toContain("这里有更多的段落内容");
    });
  });

  describe("链接提取测试", () => {
    it("应该能够提取并转换相对链接", () => {
      const html = `
        <html>
          <body>
            <a href="/page1">相对链接1</a>
            <a href="./page2">相对链接2</a>
            <a href="../page3">相对链接3</a>
            <a href="page4">相对链接4</a>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com/path/");

      expect(result.links).toContain("https://example.com/page1");
      expect(result.links).toContain("https://example.com/path/page2");
      expect(result.links).toContain("https://example.com/page3");
      expect(result.links).toContain("https://example.com/path/page4");
    });

    it("应该能够保留绝对链接", () => {
      const html = `
        <html>
          <body>
            <a href="https://external.com/page">外部链接</a>
            <a href="http://another.com/page">另一个外部链接</a>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com");

      expect(result.links).toContain("https://external.com/page");
      expect(result.links).toContain("http://another.com/page");
    });

    it("应该能够过滤无效链接", () => {
      const html = `
        <html>
          <body>
            <a href="#section">锚点链接</a>
            <a href="javascript:void(0)">JavaScript链接</a>
            <a href="mailto:test@example.com">邮件链接</a>
            <a href="tel:+1234567890">电话链接</a>
            <a href="/valid-page">有效链接</a>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com");

      expect(result.links).toContain("https://example.com/valid-page");
      expect(result.links).not.toContain("#section");
      expect(result.links).not.toContain("javascript:void(0)");
      expect(result.links).not.toContain("mailto:test@example.com");
      expect(result.links).not.toContain("tel:+1234567890");
    });

    it("应该能够去重链接", () => {
      const html = `
        <html>
          <body>
            <a href="/page1">链接1</a>
            <a href="/page1">重复链接1</a>
            <a href="https://example.com/page1">绝对形式的链接1</a>
            <a href="/page2">链接2</a>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com");

      const page1Links = result.links.filter((link) => link.includes("page1"));
      expect(page1Links.length).toBe(1);
      expect(result.links).toContain("https://example.com/page1");
      expect(result.links).toContain("https://example.com/page2");
    });
  });

  describe("元数据提取测试", () => {
    it("应该能够提取完整的元数据", () => {
      const html = `
        <html>
          <head>
            <meta name="description" content="页面描述">
            <meta name="keywords" content="关键词1,关键词2">
            <meta name="author" content="作者名称">
            <meta name="date" content="2023-12-01">
            <meta property="article:published_time" content="2023-12-01T10:00:00Z">
            <html lang="zh-CN">
          </head>
          <body>
            <main>
              <p>这是一段测试内容，用于计算字数。包含多个单词和字符。</p>
              <a href="/link1">链接1</a>
              <a href="/link2">链接2</a>
            </main>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com");

      expect(result.metadata.description).toBe("页面描述");
      expect(result.metadata.keywords).toBe("关键词1,关键词2");
      expect(result.metadata.author).toBe("作者名称");
      expect(result.metadata.publishDate).toBe("2023-12-01T10:00:00Z");
      expect(result.metadata.language).toBe("zh-CN");
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.linkCount).toBe(2);
    });

    it("应该能够处理缺少元数据的情况", () => {
      const html = `
        <html>
          <body>
            <p>简单内容</p>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com");

      expect(result.metadata.description).toBeUndefined();
      expect(result.metadata.keywords).toBeUndefined();
      expect(result.metadata.author).toBeUndefined();
      expect(result.metadata.publishDate).toBeUndefined();
      expect(result.metadata.language).toBeUndefined();
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.linkCount).toBe(0);
    });

    it("应该能够正确计算字数", () => {
      const html = `
        <html>
          <body>
            <main>
              <p>这是 一个 测试 句子。</p>
              <p>Another test sentence with multiple words.</p>
            </main>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com");

      expect(result.metadata.wordCount).toBeGreaterThan(8); // 至少包含基本单词数
    });

    it("应该能够正确计算链接数", () => {
      const html = `
        <html>
          <body>
            <main>
              <a href="/link1">链接1</a>
              <a href="/link2">链接2</a>
              <a href="#invalid">无效链接</a>
              <a href="/link3">链接3</a>
            </main>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com");

      expect(result.metadata.linkCount).toBe(3); // 只计算有效链接
    });
  });

  describe("数据清洗测试", () => {
    it("应该能够清理多余的空白字符", () => {
      const html = `
        <html>
          <body>
            <main>
              <p>   这是   一个   有多余空格的   段落   </p>
              <p>\n\n\n另一个\n\n段落\n\n\n</p>
            </main>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com");

      expect(result.content).not.toMatch(/\s{2,}/); // 不应该有连续的空白字符
      expect(result.content).toContain("这是 一个 有多余空格的 段落");
      expect(result.content).toContain("另一个 段落");
    });

    it("应该能够处理特殊字符", () => {
      const html = `
        <html>
          <body>
            <main>
              <p>包含特殊字符：&amp; &lt; &gt; &quot; &#39;</p>
              <p>Unicode字符：© ® ™ € £</p>
            </main>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com");

      expect(result.content).toContain("包含特殊字符：& < > \" '");
      expect(result.content).toContain("Unicode字符：© ® ™ € £");
    });
  });

  describe("边界情况测试", () => {
    it("应该能够处理空HTML", () => {
      const html = "";

      const result = service.extractContent(html, "https://example.com");

      expect(result.title).toBe("无标题");
      expect(result.content).toBe("");
      expect(result.links).toEqual([]);
      expect(result.metadata.wordCount).toBe(0);
      expect(result.metadata.linkCount).toBe(0);
    });

    it("应该能够处理无效HTML", () => {
      const html =
        "<html><body><p>未闭合的段落<div>嵌套错误</p></div></body></html>";

      const result = service.extractContent(html, "https://example.com");

      expect(result.title).toBe("无标题");
      expect(result.content).toContain("未闭合的段落");
      expect(result.content).toContain("嵌套错误");
    });

    it("应该能够处理超大HTML文档", () => {
      const largeContent = "word ".repeat(2000); // 创建2000个单词
      const html = `
        <html>
          <body>
            <main>
              <h1>大文档标题</h1>
              <p>${largeContent}</p>
            </main>
          </body>
        </html>
      `;

      const result = service.extractContent(html, "https://example.com");

      expect(result.title).toBe("大文档标题");
      expect(result.content).toContain("大文档标题");
      expect(result.content).toContain("word");
      expect(result.metadata.wordCount).toBeGreaterThan(1000);
    });

    it("应该能够处理无效的baseUrl", () => {
      const html = `
        <html>
          <body>
            <a href="/page1">链接1</a>
          </body>
        </html>
      `;

      // 应该能够处理无效URL而不崩溃
      expect(() => {
        service.extractContent(html, "invalid-url");
      }).toThrow("Invalid URL");
    });
  });

  describe("链接提取测试", () => {
    it("应该能够提取 spa 页面中的所有链接", () => {
      const html = `
      
<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>达观RPA 用户手册</title>
    <meta name="generator" content="VuePress 1.8.2">
    <link rel="icon" href="/v16/images/logo.png">
    <meta name="description" content="达观RPA极大提高了业务运营效率，已成功应用于材料填报、智能审核、系统操控、报表处理、票据分析等众多业务场景，有效降低文本处理流程中的人为错误风险，助力企业数字化升级。">
    
    <link rel="preload" href="/v16/assets/css/0.styles.624e8cba.css" as="style"><link rel="preload" href="/v16/assets/js/app.55e517ba.js" as="script"><link rel="preload" href="/v16/assets/js/7.02b303e5.js" as="script"><link rel="preload" href="/v16/assets/js/26.b0baf225.js" as="script"><link rel="preload" href="/v16/assets/js/35.46c07970.js" as="script"><link rel="prefetch" href="/v16/assets/js/10.1fd0333c.js"><link rel="prefetch" href="/v16/assets/js/11.85394e8f.js"><link rel="prefetch" href="/v16/assets/js/12.e950d93d.js"><link rel="prefetch" href="/v16/assets/js/13.8205a9c5.js"><link rel="prefetch" href="/v16/assets/js/14.0ae6dd35.js"><link rel="prefetch" href="/v16/assets/js/15.59971cf0.js"><link rel="prefetch" href="/v16/assets/js/16.47f24f46.js"><link rel="prefetch" href="/v16/assets/js/17.3f2c0208.js"><link rel="prefetch" href="/v16/assets/js/18.7e7a6567.js"><link rel="prefetch" href="/v16/assets/js/19.387e05d9.js"><link rel="prefetch" href="/v16/assets/js/2.51ce2191.js"><link rel="prefetch" href="/v16/assets/js/20.07e94059.js"><link rel="prefetch" href="/v16/assets/js/21.7e9eeeb8.js"><link rel="prefetch" href="/v16/assets/js/22.565ee786.js"><link rel="prefetch" href="/v16/assets/js/23.1ceb650f.js"><link rel="prefetch" href="/v16/assets/js/24.29d7f0d5.js"><link rel="prefetch" href="/v16/assets/js/25.0dc12432.js"><link rel="prefetch" href="/v16/assets/js/27.f6e694d7.js"><link rel="prefetch" href="/v16/assets/js/28.416a6721.js"><link rel="prefetch" href="/v16/assets/js/29.69c9cd75.js"><link rel="prefetch" href="/v16/assets/js/3.6b674c4c.js"><link rel="prefetch" href="/v16/assets/js/30.bd389ff1.js"><link rel="prefetch" href="/v16/assets/js/31.6aadd72a.js"><link rel="prefetch" href="/v16/assets/js/32.c73925fc.js"><link rel="prefetch" href="/v16/assets/js/33.22d4b440.js"><link rel="prefetch" href="/v16/assets/js/34.73a9db27.js"><link rel="prefetch" href="/v16/assets/js/36.4cfdf968.js"><link rel="prefetch" href="/v16/assets/js/37.d78d5c61.js"><link rel="prefetch" href="/v16/assets/js/38.c328220b.js"><link rel="prefetch" href="/v16/assets/js/39.705f9e34.js"><link rel="prefetch" href="/v16/assets/js/4.7136607e.js"><link rel="prefetch" href="/v16/assets/js/40.badfb63c.js"><link rel="prefetch" href="/v16/assets/js/41.3e538dfe.js"><link rel="prefetch" href="/v16/assets/js/42.df26e56a.js"><link rel="prefetch" href="/v16/assets/js/43.4f20ae80.js"><link rel="prefetch" href="/v16/assets/js/44.e5f72bc4.js"><link rel="prefetch" href="/v16/assets/js/45.bdd3d21e.js"><link rel="prefetch" href="/v16/assets/js/46.b1f7b23b.js"><link rel="prefetch" href="/v16/assets/js/47.9c4b0a6c.js"><link rel="prefetch" href="/v16/assets/js/48.afc79edc.js"><link rel="prefetch" href="/v16/assets/js/49.9bf04e6c.js"><link rel="prefetch" href="/v16/assets/js/5.0d616217.js"><link rel="prefetch" href="/v16/assets/js/50.71bce918.js"><link rel="prefetch" href="/v16/assets/js/51.064e76f0.js"><link rel="prefetch" href="/v16/assets/js/52.bfc8076d.js"><link rel="prefetch" href="/v16/assets/js/53.628449b6.js"><link rel="prefetch" href="/v16/assets/js/54.be4c3ac8.js"><link rel="prefetch" href="/v16/assets/js/55.01bce191.js"><link rel="prefetch" href="/v16/assets/js/56.8a511418.js"><link rel="prefetch" href="/v16/assets/js/6.8563fc8b.js"><link rel="prefetch" href="/v16/assets/js/8.531c6b23.js"><link rel="prefetch" href="/v16/assets/js/9.bf992c09.js">
    <link rel="stylesheet" href="/v16/assets/css/0.styles.624e8cba.css">
  </head>
  <body>
    <div id="app" data-server-rendered="true"><div class="theme-container no-sidebar"><header class="navbar"><div class="sidebar-button"><svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" viewBox="0 0 448 512" class="icon"><path fill="currentColor" d="M436 124H12c-6.627 0-12-5.373-12-12V80c0-6.627 5.373-12 12-12h424c6.627 0 12 5.373 12 12v32c0 6.627-5.373 12-12 12zm0 160H12c-6.627 0-12-5.373-12-12v-32c0-6.627 5.373-12 12-12h424c6.627 0 12 5.373 12 12v32c0 6.627-5.373 12-12 12zm0 160H12c-6.627 0-12-5.373-12-12v-32c0-6.627 5.373-12 12-12h424c6.627 0 12 5.373 12 12v32c0 6.627-5.373 12-12 12z"></path></svg></div> <a href="/v16/" aria-current="page" class="home-link router-link-exact-active router-link-active"><!----> <span class="site-name">达观RPA 用户手册</span></a> <span class="badge tip" style="vertical-align:top;" data-v-6eb0829b>v16</span> <div class="links"><div class="search-box"><input aria-label="Search" autocomplete="off" spellcheck="false" value=""> <!----></div> <nav class="nav-links can-hide"><div class="nav-item"><a href="/v16/start/" class="nav-link">
  快速入门
</a></div><div class="nav-item"><a href="/v16/studio/" class="nav-link">
  开发平台
</a></div><div class="nav-item"><a href="/v16/console/" class="nav-link">
  控制中心
</a></div><div class="nav-item"><a href="/v16/robot/" class="nav-link">
  机器人
</a></div><div class="nav-item"><a href="/v16/operation/" class="nav-link">
  运营平台
</a></div><div class="nav-item"><a href="/v16/blocks/command/" class="nav-link">
  可视化控件
</a></div><div class="nav-item"><a href="/v16/sdk-api/win32.html" class="nav-link">
  SDK
</a></div> <div class="nav-item"><div class="dropdown-wrapper"><button type="button" aria-label="其他版本" class="dropdown-title"><span class="title">其他版本</span> <span class="arrow down"></span></button> <button type="button" aria-label="其他版本" class="mobile-dropdown-title"><span class="title">其他版本</span> <span class="arrow right"></span></button> <ul class="nav-dropdown" style="display:none;"></ul></div></div> <!----></nav></div></header> <div class="sidebar-mask"></div> <aside class="sidebar"><nav class="nav-links"><div class="nav-item"><a href="/v16/start/" class="nav-link">
  快速入门
</a></div><div class="nav-item"><a href="/v16/studio/" class="nav-link">
  开发平台
</a></div><div class="nav-item"><a href="/v16/console/" class="nav-link">
  控制中心
</a></div><div class="nav-item"><a href="/v16/robot/" class="nav-link">
  机器人
</a></div><div class="nav-item"><a href="/v16/operation/" class="nav-link">
  运营平台
</a></div><div class="nav-item"><a href="/v16/blocks/command/" class="nav-link">
  可视化控件
</a></div><div class="nav-item"><a href="/v16/sdk-api/win32.html" class="nav-link">
  SDK
</a></div> <div class="nav-item"><div class="dropdown-wrapper"><button type="button" aria-label="其他版本" class="dropdown-title"><span class="title">其他版本</span> <span class="arrow down"></span></button> <button type="button" aria-label="其他版本" class="mobile-dropdown-title"><span class="title">其他版本</span> <span class="arrow right"></span></button> <ul class="nav-dropdown" style="display:none;"></ul></div></div> <!----></nav>  <!----> </aside> <main aria-labelledby="main-title" class="home"><header class="hero"><img src="/v16/images/home-logo.png" alt="hero"> <h1 id="main-title">
      达观RPA 用户手册
    </h1> <p class="description">
      达观RPA极大提高了业务运营效率，已成功应用于材料填报、智能审核、系统操控、报表处理、票据分析等众多业务场景，有效降低文本处理流程中的人为错误风险，助力企业数字化升级。
    </p> <p class="action"><a href="/v16/start/" class="nav-link action-button">
  开始阅读
</a></p></header> <!----> <div class="theme-default-content custom content__default"></div> <!----></main></div><div class="global-ui"></div></div>
    <script src="/v16/assets/js/app.55e517ba.js" defer></script><script src="/v16/assets/js/7.02b303e5.js" defer></script><script src="/v16/assets/js/26.b0baf225.js" defer></script><script src="/v16/assets/js/35.46c07970.js" defer></script>
  </body>
</html>

      `;
      const result = service.extractContent(html, "https://example.com");
      console.log("result.links.length", result.links);
      // 验证提取到的链接数量
      expect(result.links.length).greaterThan(5);
      // 验证包含预期的链接
      expect(result.links).toContain("https://example.com/v16/start/");
      expect(result.links).toContain("https://example.com/v16/studio/");
      expect(result.links).toContain("https://example.com/v16/console/");
      expect(result.links).toContain("https://example.com/v16/robot/");
      expect(result.links).toContain("https://example.com/v16/operation/");
      expect(result.links).toContain("https://example.com/v16/blocks/command/");
      expect(result.links).toContain(
        "https://example.com/v16/sdk-api/win32.html"
      );
    });
  });
});
