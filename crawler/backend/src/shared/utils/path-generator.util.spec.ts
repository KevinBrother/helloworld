import { describe, it, expect } from 'vitest';
import { PathGenerator } from './path-generator.util';

describe('PathGenerator', () => {
  describe('generateUrlHash', () => {
    it('应该为相同的URL生成相同的哈希值', () => {
      const url = 'https://example.com/page';
      const hash1 = PathGenerator.generateUrlHash(url);
      const hash2 = PathGenerator.generateUrlHash(url);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(32); // MD5哈希长度
    });

    it('应该为不同的URL生成不同的哈希值', () => {
      const url1 = 'https://example.com/page1';
      const url2 = 'https://example.com/page2';
      const hash1 = PathGenerator.generateUrlHash(url1);
      const hash2 = PathGenerator.generateUrlHash(url2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('应该处理空字符串', () => {
      const hash = PathGenerator.generateUrlHash('');
      
      expect(hash).toHaveLength(32);
      expect(hash).toBe('d41d8cd98f00b204e9800998ecf8427e'); // 空字符串的MD5
    });

    it('应该处理包含特殊字符的URL', () => {
      const url = 'https://example.com/页面?参数=值&other=测试';
      const hash = PathGenerator.generateUrlHash(url);
      
      expect(hash).toHaveLength(32);
      expect(typeof hash).toBe('string');
    });
  });

  describe('extractDomain', () => {
    it('应该能够提取标准HTTP URL的域名', () => {
      const url = 'https://example.com/path/to/page';
      const domain = PathGenerator.extractDomain(url);
      
      expect(domain).toBe('example.com');
    });

    it('应该能够提取HTTPS URL的域名', () => {
      const url = 'https://www.example.com/path';
      const domain = PathGenerator.extractDomain(url);
      
      expect(domain).toBe('www.example.com');
    });

    it('应该能够提取带端口号的域名', () => {
      const url = 'http://example.com:8080/path';
      const domain = PathGenerator.extractDomain(url);
      
      expect(domain).toBe('example.com');
    });

    it('应该能够提取子域名', () => {
      const url = 'https://api.subdomain.example.com/endpoint';
      const domain = PathGenerator.extractDomain(url);
      
      expect(domain).toBe('api.subdomain.example.com');
    });

    it('应该能够处理IP地址', () => {
      const url = 'http://192.168.1.1/path';
      const domain = PathGenerator.extractDomain(url);
      
      expect(domain).toBe('192.168.1.1');
    });

    it('应该处理无效的URL', () => {
      const invalidUrl = 'not-a-valid-url';
      const domain = PathGenerator.extractDomain(invalidUrl);
      
      expect(domain).toBe('unknown-domain');
    });

    it('应该处理空字符串', () => {
      const domain = PathGenerator.extractDomain('');
      
      expect(domain).toBe('unknown-domain');
    });

    it('应该处理只有协议的URL', () => {
      const url = 'https://';
      const domain = PathGenerator.extractDomain(url);
      
      expect(domain).toBe('unknown-domain');
    });
  });

  describe('sanitizePath', () => {
    it('应该移除开头和结尾的斜杠', () => {
      const path = '/path/to/page/';
      const sanitized = PathGenerator.sanitizePath(path);
      
      expect(sanitized).toBe('path/to/page');
    });

    it('应该替换非法字符', () => {
      const path = 'path<with>illegal:characters|and?more*';
      const sanitized = PathGenerator.sanitizePath(path);
      
      expect(sanitized).toBe('path_with_illegal_characters_and_more_');
    });

    it('应该替换连续的点', () => {
      const path = 'path/with/../multiple...dots';
      const sanitized = PathGenerator.sanitizePath(path);
      
      expect(sanitized).toBe('path/with/_/multiple_dots');
    });

    it('应该替换空格', () => {
      const path = 'path with spaces/and more spaces';
      const sanitized = PathGenerator.sanitizePath(path);
      
      expect(sanitized).toBe('path_with_spaces/and_more_spaces');
    });

    it('应该处理空路径段', () => {
      const path = 'path//empty///segments';
      const sanitized = PathGenerator.sanitizePath(path);
      
      expect(sanitized).toBe('path/_/empty/_/_/segments');
    });

    it('应该处理特殊路径段', () => {
      const path = 'path/./current/../parent';
      const sanitized = PathGenerator.sanitizePath(path);
      
      expect(sanitized).toBe('path/_/current/_/parent');
    });

    it('应该截断过长的路径段', () => {
      const longSegment = 'a'.repeat(150);
      const path = `path/${longSegment}/end`;
      const sanitized = PathGenerator.sanitizePath(path);
      
      expect(sanitized).toContain('path/');
      expect(sanitized).toContain('/end');
      expect(sanitized.split('/')[1]).toHaveLength(105); // 100 + '_hash'
    });

    it('应该处理空字符串', () => {
      const sanitized = PathGenerator.sanitizePath('');
      
      expect(sanitized).toBe('_');
    });

    it('应该处理只有斜杠的字符串', () => {
      const sanitized = PathGenerator.sanitizePath('///');
      
      expect(sanitized).toBe('_');
    });
  });

  describe('getDirectoryPath', () => {
    it('应该提取URL的目录路径', () => {
      const url = 'https://example.com/path/to/page.html';
      const dirPath = PathGenerator.getDirectoryPath(url);
      
      expect(dirPath).toBe('path/to/page.html');
    });

    it('应该处理根路径', () => {
      const url = 'https://example.com/';
      const dirPath = PathGenerator.getDirectoryPath(url);
      
      expect(dirPath).toBe('_root');
    });

    it('应该处理没有文件名的路径', () => {
      const url = 'https://example.com/path/to/directory/';
      const dirPath = PathGenerator.getDirectoryPath(url);
      
      expect(dirPath).toBe('path/to/directory');
    });

    it('应该处理深层嵌套的路径', () => {
      const url = 'https://example.com/a/b/c/d/e/file.html';
      const dirPath = PathGenerator.getDirectoryPath(url);
      
      expect(dirPath).toBe('a/b/c/d/e/file.html');
    });

    it('应该处理带查询参数的URL', () => {
      const url = 'https://example.com/path/to/page.html?param=value';
      const dirPath = PathGenerator.getDirectoryPath(url);
      
      expect(dirPath).toBe('path/to/page.html');
    });

    it('应该处理带锚点的URL', () => {
      const url = 'https://example.com/path/to/page.html#section';
      const dirPath = PathGenerator.getDirectoryPath(url);
      
      expect(dirPath).toBe('path/to/page.html');
    });

    it('应该处理无效的URL', () => {
      const invalidUrl = 'not-a-valid-url';
      const dirPath = PathGenerator.getDirectoryPath(invalidUrl);
      
      expect(dirPath).toBe('_unknown');
    });
  });

  describe('generatePagePath', () => {
    it('应该生成基本的页面路径', () => {
      const url = 'https://example.com/page.html';
      const pagePath = PathGenerator.generatePagePath(url);
      
      expect(pagePath).toContain('example.com');
      expect(pagePath).toContain('page.html');
    });

    it('应该包含会话ID（如果提供）', () => {
      const url = 'https://example.com/page.html';
      const sessionId = 'session-123';
      const pagePath = PathGenerator.generatePagePath(url, sessionId);
      
      expect(pagePath).toContain('pages');
      expect(pagePath).toContain('example.com');
    });

    it('应该处理复杂的URL路径', () => {
      const url = 'https://example.com/path/to/deep/page.html';
      const pagePath = PathGenerator.generatePagePath(url);
      
      expect(pagePath).toContain('example.com');
      expect(pagePath).toContain('path/to/deep');
      expect(pagePath).toContain('page.html');
    });

    it('应该处理带查询参数的URL', () => {
      const url = 'https://example.com/page.html?param=value&other=test';
      const pagePath = PathGenerator.generatePagePath(url);
      
      expect(pagePath).toContain('example.com');
      expect(pagePath).toContain('page.html');
    });
  });

  describe('generateSessionPath', () => {
    it('应该生成基本的会话路径', () => {
      const sessionId = 'session-123';
      const sessionPath = PathGenerator.generateSessionPath(sessionId);
      
      expect(sessionPath).toContain('sessions');
    });

    it('应该包含域名（如果提供）', () => {
      const sessionId = 'session-123';
      const domain = 'example.com';
      const sessionPath = PathGenerator.generateSessionPath(sessionId, domain);
      
      expect(sessionPath).toContain('sessions');
      expect(sessionPath).toContain(domain);
    });

    it('应该处理特殊字符的域名', () => {
      const sessionId = 'session-123';
      const domain = 'sub-domain.example.com';
      const sessionPath = PathGenerator.generateSessionPath(sessionId, domain);
      
      expect(sessionPath).toContain('sessions');
      expect(sessionPath).toContain('sub-domain.example.com');
    });
  });

  describe('generateIndexPath', () => {
    it('应该生成索引路径', () => {
      const domain = 'example.com';
      const indexPath = PathGenerator.generateIndexPath(domain);
      
      expect(indexPath).toContain(domain);
      expect(indexPath).toContain('index');
    });

    it('应该处理子域名', () => {
      const domain = 'api.example.com';
      const indexPath = PathGenerator.generateIndexPath(domain);
      
      expect(indexPath).toContain('api.example.com');
    });

    it('应该处理带端口的域名', () => {
      const domain = 'localhost:3000';
      const indexPath = PathGenerator.generateIndexPath(domain);
      
      expect(indexPath).toContain('localhost:3000');
    });
  });

  describe('sanitizeFileName', () => {
    it('应该替换非法文件名字符', () => {
      const fileName = 'file<name>with:illegal|characters?.txt';
      const sanitized = PathGenerator.sanitizeFileName(fileName);
      
      expect(sanitized).toBe('file_name_with_illegal_characters_.txt');
    });

    it('应该处理空文件名', () => {
      const sanitized = PathGenerator.sanitizeFileName('');
      
      expect(sanitized).toBe('');
    });

    it('应该处理只有空格的文件名', () => {
      const sanitized = PathGenerator.sanitizeFileName('   ');
      
      expect(sanitized).toBe('_');
    });

    it('应该保留有效的文件名', () => {
      const fileName = 'valid-file_name.123.txt';
      const sanitized = PathGenerator.sanitizeFileName(fileName);
      
      expect(sanitized).toBe(fileName);
    });

    it('应该截断过长的文件名', () => {
      const longFileName = 'a'.repeat(300) + '.txt';
      const sanitized = PathGenerator.sanitizeFileName(longFileName);
      
      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized).toMatch(/^a+$/); // Should be truncated 'a' characters only
    });

    it('应该处理Unicode字符', () => {
      const fileName = '测试文件名.txt';
      const sanitized = PathGenerator.sanitizeFileName(fileName);
      
      expect(sanitized).toContain('测试文件名');
      expect(sanitized).toMatch(/\.txt$/);
    });
  });

  describe('generateSessionId', () => {
    it('应该生成唯一的会话ID', () => {
      const sessionId1 = PathGenerator.generateSessionId();
      const sessionId2 = PathGenerator.generateSessionId();
      
      expect(sessionId1).not.toBe(sessionId2);
      expect(typeof sessionId1).toBe('string');
      expect(typeof sessionId2).toBe('string');
    });

    it('应该生成固定长度的会话ID', () => {
      const sessionId = PathGenerator.generateSessionId();
      
      expect(sessionId.length).toBeGreaterThan(10); // timestamp + random string with hyphen
    });

    it('应该生成只包含字母数字的会话ID', () => {
      const sessionId = PathGenerator.generateSessionId();
      
      expect(sessionId).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    });

    it('应该在多次调用时生成不同的ID', () => {
      const sessionIds = new Set();
      
      for (let i = 0; i < 100; i++) {
        sessionIds.add(PathGenerator.generateSessionId());
      }
      
      expect(sessionIds.size).toBe(100); // 所有ID都应该是唯一的
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理null和undefined输入', () => {
      expect(() => PathGenerator.generateUrlHash(null as any)).toThrow();
      expect(() => PathGenerator.extractDomain(undefined as any)).not.toThrow();
      expect(() => PathGenerator.sanitizePath(null as any)).toThrow();
    });

    it('应该处理非常长的URL', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2000);
      
      expect(() => PathGenerator.generateUrlHash(longUrl)).not.toThrow();
      expect(() => PathGenerator.extractDomain(longUrl)).not.toThrow();
      expect(() => PathGenerator.getDirectoryPath(longUrl)).not.toThrow();
    });

    it('应该处理包含所有类型特殊字符的路径', () => {
      const specialPath = '/<>:"|?*\\path/with/all/special/chars';
      const sanitized = PathGenerator.sanitizePath(specialPath);
      
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).not.toContain(':');
      expect(sanitized).not.toContain('"');
      expect(sanitized).not.toContain('|');
      expect(sanitized).not.toContain('?');
      expect(sanitized).not.toContain('*');
    });

    it('应该处理极端的URL格式', () => {
      const extremeUrls = [
        'ftp://example.com/file',
        'file:///local/path',
        'data:text/plain;base64,SGVsbG8=',
        'javascript:void(0)',
        'mailto:test@example.com',
      ];
      
      extremeUrls.forEach(url => {
        expect(() => PathGenerator.extractDomain(url)).not.toThrow();
        expect(() => PathGenerator.generateUrlHash(url)).not.toThrow();
      });
    });
  });
});