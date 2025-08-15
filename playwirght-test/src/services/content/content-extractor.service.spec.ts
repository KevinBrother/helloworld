import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContentExtractorService } from './content-extractor.service';

describe('ContentExtractorService', () => {
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

  describe('基础功能测试', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('内容提取测试', () => {
    it('应该能够提取基本页面内容', () => {
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
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.title).toBe('测试页面');
      expect(result.content).toContain('主标题');
      expect(result.content).toContain('这是主要内容段落');
      expect(result.links).toContain('https://example.com/page1');
      expect(result.links).not.toContain('https://external.com');
      expect(result.metadata.description).toBe('这是一个测试页面');
      expect(result.metadata.keywords).toBe('测试,页面,内容');
      expect(result.metadata.author).toBe('测试作者');
    });

    it('应该能够处理没有title标签的页面', () => {
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
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.title).toBe('测试页面');
    });

    it('应该能够使用h1作为标题备选', () => {
      const html = `
        <html>
          <body>
            <h1>H1标题</h1>
            <p>内容</p>
          </body>
        </html>
      `;
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.title).toBe('H1标题');
    });

    it('应该能够处理没有任何标题的页面', () => {
      const html = `
        <html>
          <body>
            <p>只有内容，没有标题</p>
          </body>
        </html>
      `;
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.title).toBe('无标题');
    });
  });

  describe('主要内容提取测试', () => {
    it('应该能够从main标签提取内容', () => {
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
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.content).toContain('主要内容');
      expect(result.content).toContain('这是主要段落');
      expect(result.content).not.toContain('导航内容');
      expect(result.content).not.toContain('页脚内容');
    });

    it('应该能够从article标签提取内容', () => {
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
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.content).toContain('文章标题');
      expect(result.content).toContain('文章内容段落');
      expect(result.content).not.toContain('侧边栏内容');
    });

    it('应该能够从.content类选择器提取内容', () => {
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
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.content).toContain('内容区域标题');
      expect(result.content).toContain('内容区域段落');
      expect(result.content).not.toContain('侧边栏');
    });

    it('应该能够从markdown-body类提取内容', () => {
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
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.content).toContain('Markdown内容');
      expect(result.content).toContain('这是markdown渲染的内容');
    });

    it('应该能够移除脚本和样式标签', () => {
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
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.content).toContain('主要内容');
      expect(result.content).toContain('段落内容');
      expect(result.content).not.toContain('color: red');
      expect(result.content).not.toContain('console.log');
    });

    it('应该能够处理内容长度不足的情况', () => {
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
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.content).toContain('这是一个足够长的内容区域');
      expect(result.content).toContain('这里有更多的段落内容');
    });
  });

  describe('链接提取测试', () => {
    it('应该能够提取并转换相对链接', () => {
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
      
      const result = service.extractContent(html, 'https://example.com/path/');
      
      expect(result.links).toContain('https://example.com/page1');
      expect(result.links).toContain('https://example.com/path/page2');
      expect(result.links).toContain('https://example.com/page3');
      expect(result.links).toContain('https://example.com/path/page4');
    });

    it('应该能够保留绝对链接', () => {
      const html = `
        <html>
          <body>
            <a href="https://external.com/page">外部链接</a>
            <a href="http://another.com/page">另一个外部链接</a>
          </body>
        </html>
      `;
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.links).toContain('https://external.com/page');
      expect(result.links).toContain('http://another.com/page');
    });

    it('应该能够过滤无效链接', () => {
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
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.links).toContain('https://example.com/valid-page');
      expect(result.links).not.toContain('#section');
      expect(result.links).not.toContain('javascript:void(0)');
      expect(result.links).not.toContain('mailto:test@example.com');
      expect(result.links).not.toContain('tel:+1234567890');
    });

    it('应该能够去重链接', () => {
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
      
      const result = service.extractContent(html, 'https://example.com');
      
      const page1Links = result.links.filter(link => link.includes('page1'));
      expect(page1Links.length).toBe(1);
      expect(result.links).toContain('https://example.com/page1');
      expect(result.links).toContain('https://example.com/page2');
    });
  });

  describe('元数据提取测试', () => {
    it('应该能够提取完整的元数据', () => {
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
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.metadata.description).toBe('页面描述');
      expect(result.metadata.keywords).toBe('关键词1,关键词2');
      expect(result.metadata.author).toBe('作者名称');
      expect(result.metadata.publishDate).toBe('2023-12-01T10:00:00Z');
      expect(result.metadata.language).toBe('zh-CN');
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.linkCount).toBe(2);
    });

    it('应该能够处理缺少元数据的情况', () => {
      const html = `
        <html>
          <body>
            <p>简单内容</p>
          </body>
        </html>
      `;
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.metadata.description).toBeUndefined();
      expect(result.metadata.keywords).toBeUndefined();
      expect(result.metadata.author).toBeUndefined();
      expect(result.metadata.publishDate).toBeUndefined();
      expect(result.metadata.language).toBeUndefined();
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.linkCount).toBe(0);
    });

    it('应该能够正确计算字数', () => {
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
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.metadata.wordCount).toBeGreaterThan(8); // 至少包含基本单词数
    });

    it('应该能够正确计算链接数', () => {
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
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.metadata.linkCount).toBe(3); // 只计算有效链接
    });
  });

  describe('数据清洗测试', () => {
    it('应该能够清理多余的空白字符', () => {
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
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.content).not.toMatch(/\s{2,}/); // 不应该有连续的空白字符
      expect(result.content).toContain('这是 一个 有多余空格的 段落');
      expect(result.content).toContain('另一个 段落');
    });

    it('应该能够处理特殊字符', () => {
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
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.content).toContain('包含特殊字符：& < > " \'');
      expect(result.content).toContain('Unicode字符：© ® ™ € £');
    });
  });

  describe('边界情况测试', () => {
    it('应该能够处理空HTML', () => {
      const html = '';
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.title).toBe('无标题');
      expect(result.content).toBe('');
      expect(result.links).toEqual([]);
      expect(result.metadata.wordCount).toBe(0);
      expect(result.metadata.linkCount).toBe(0);
    });

    it('应该能够处理无效HTML', () => {
      const html = '<html><body><p>未闭合的段落<div>嵌套错误</p></div></body></html>';
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.title).toBe('无标题');
      expect(result.content).toContain('未闭合的段落');
      expect(result.content).toContain('嵌套错误');
    });

    it('应该能够处理超大HTML文档', () => {
      const largeContent = 'word '.repeat(2000); // 创建2000个单词
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
      
      const result = service.extractContent(html, 'https://example.com');
      
      expect(result.title).toBe('大文档标题');
      expect(result.content).toContain('大文档标题');
      expect(result.content).toContain('word');
      expect(result.metadata.wordCount).toBeGreaterThan(1000);
    });

    it('应该能够处理无效的baseUrl', () => {
      const html = `
        <html>
          <body>
            <a href="/page1">链接1</a>
          </body>
        </html>
      `;
      
      // 应该能够处理无效URL而不崩溃
      expect(() => {
        service.extractContent(html, 'invalid-url');
      }).toThrow('Invalid URL');
    });
  });
});