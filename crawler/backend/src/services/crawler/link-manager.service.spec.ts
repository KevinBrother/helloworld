import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LinkManagerService } from './link-manager.service';

describe('LinkManagerService', () => {
  let service: LinkManagerService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [LinkManagerService],
    }).compile();

    service = module.get<LinkManagerService>(LinkManagerService);
  });

  afterEach(async () => {
    await module.close();
    vi.clearAllMocks();
  });

  describe('基础功能测试', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('应该初始化为空状态', () => {
      expect(service.getProcessedCount()).toBe(0);
      expect(service.getDiscoveredCount()).toBe(0);
      expect(service.getQueueSize()).toBe(0);
    });

    it('应该能够清空所有数据', () => {
      // 先添加一些数据
      service.addLinks(
        ['https://example.com/page1', 'https://example.com/page2'],
        'https://example.com',
        0,
        2,
        ['example.com'],
        []
      );
      service.markAsProcessed('https://example.com/page1');

      expect(service.getQueueSize()).toBeGreaterThan(0);
      expect(service.getProcessedCount()).toBeGreaterThan(0);

      // 清空数据
      service.clear();

      expect(service.getProcessedCount()).toBe(0);
      expect(service.getDiscoveredCount()).toBe(0);
      expect(service.getQueueSize()).toBe(0);
    });
  });

  describe('链接添加测试', () => {
    it('应该能够添加有效链接', () => {
      const links = ['https://example.com/page1', 'https://example.com/page2'];
      const addedCount = service.addLinks(
        links,
        'https://example.com',
        0,
        2,
        ['example.com'],
        []
      );

      expect(addedCount).toBe(2);
      expect(service.getDiscoveredCount()).toBe(2);
      expect(service.getQueueSize()).toBe(2);
    });

    it('应该过滤重复链接', () => {
      const links = ['https://example.com/page1', 'https://example.com/page1'];
      const addedCount = service.addLinks(
        links,
        'https://example.com',
        0,
        2,
        ['example.com'],
        []
      );

      expect(addedCount).toBe(1);
      expect(service.getDiscoveredCount()).toBe(1);
    });

    it('应该过滤超过最大深度的链接', () => {
      const links = ['https://example.com/page1'];
      const addedCount = service.addLinks(
        links,
        'https://example.com',
        2, // 当前深度为2
        2, // 最大深度为2
        ['example.com'],
        []
      );

      expect(addedCount).toBe(0); // 下一级深度为3，超过最大深度
      expect(service.getDiscoveredCount()).toBe(0);
    });

    it('应该过滤不在允许域名列表中的链接', () => {
      const links = [
        'https://example.com/page1',
        'https://other.com/page1'
      ];
      const addedCount = service.addLinks(
        links,
        'https://example.com',
        0,
        2,
        ['example.com'], // 只允许example.com
        []
      );

      expect(addedCount).toBe(1); // 只有example.com的链接被添加
      expect(service.getDiscoveredCount()).toBe(1);
    });

    it('应该过滤匹配排除模式的链接', () => {
      const links = [
        'https://example.com/page1',
        'https://example.com/admin/page1',
        'https://example.com/private/page1'
      ];
      const addedCount = service.addLinks(
        links,
        'https://example.com',
        0,
        2,
        ['example.com'],
        ['/admin/*', '/private/*']
      );

      expect(addedCount).toBe(1); // 只有普通页面被添加
      expect(service.getDiscoveredCount()).toBe(1);
    });

    it('应该过滤非HTTP协议的链接', () => {
      const links = [
        'https://example.com/page1',
        'ftp://example.com/file.txt',
        'mailto:test@example.com'
      ];
      const addedCount = service.addLinks(
        links,
        'https://example.com',
        0,
        2,
        ['example.com'],
        []
      );

      expect(addedCount).toBe(1); // 只有HTTPS链接被添加
      expect(service.getDiscoveredCount()).toBe(1);
    });

    it('应该过滤文件类型链接', () => {
      const links = [
        'https://example.com/page1',
        'https://example.com/image.jpg',
        'https://example.com/style.css',
        'https://example.com/script.js',
        'https://example.com/document.pdf'
      ];
      const addedCount = service.addLinks(
        links,
        'https://example.com',
        0,
        2,
        ['example.com'],
        []
      );

      expect(addedCount).toBe(1); // 只有普通页面被添加
      expect(service.getDiscoveredCount()).toBe(1);
    });

    it('应该处理子域名', () => {
      const links = [
        'https://example.com/page1',
        'https://sub.example.com/page1',
        'https://other.com/page1'
      ];
      const addedCount = service.addLinks(
        links,
        'https://example.com',
        0,
        2,
        ['example.com'], // 允许example.com及其子域名
        []
      );

      expect(addedCount).toBe(2); // example.com和sub.example.com都被添加
      expect(service.getDiscoveredCount()).toBe(2);
    });
  });

  describe('链接处理测试', () => {
    beforeEach(() => {
      // 添加一些测试链接
      service.addLinks(
        [
          'https://example.com/page1',
          'https://example.com/page2',
          'https://example.com/page3'
        ],
        'https://example.com',
        0,
        2,
        ['example.com'],
        []
      );
    });

    it('应该能够获取下一个链接', () => {
      const nextLink = service.getNextLink();
      
      expect(nextLink).toBeDefined();
      expect(nextLink!.url).toMatch(/https:\/\/example\.com\/page\d/);
      expect(nextLink!.depth).toBe(1);
      expect(nextLink!.parentUrl).toBe('https://example.com');
      expect(nextLink!.discovered).toBe(true);
      expect(nextLink!.processed).toBe(false);
    });

    it('应该按深度优先返回链接', () => {
      // 添加不同深度的链接
      service.addLinks(
        ['https://example.com/deep1'],
        'https://example.com/page1',
        1, // 深度1
        3,
        ['example.com'],
        []
      );
      service.addLinks(
        ['https://example.com/deep2'],
        'https://example.com/deep1',
        2, // 深度2
        3,
        ['example.com'],
        []
      );

      const firstLink = service.getNextLink();
      expect(firstLink!.depth).toBe(1); // 应该先返回深度较小的
    });

    it('应该能够标记链接为已处理', () => {
      const nextLink = service.getNextLink();
      const url = nextLink!.url;
      
      expect(service.isProcessed(url)).toBe(false);
      
      service.markAsProcessed(url);
      
      expect(service.isProcessed(url)).toBe(true);
      expect(service.getProcessedCount()).toBe(1);
    });

    it('应该跳过已处理的链接', () => {
      const firstLink = service.getNextLink();
      service.markAsProcessed(firstLink!.url);
      
      const secondLink = service.getNextLink();
      
      expect(secondLink!.url).not.toBe(firstLink!.url);
    });

    it('应该在没有更多链接时返回null', () => {
      // 处理所有链接
      let link;
      while ((link = service.getNextLink()) !== null) {
        service.markAsProcessed(link.url);
      }
      
      const nextLink = service.getNextLink();
      expect(nextLink).toBeNull();
    });
  });

  describe('统计信息测试', () => {
    beforeEach(() => {
      service.addLinks(
        [
          'https://example.com/page1',
          'https://example.com/page2',
          'https://example.com/page3'
        ],
        'https://example.com',
        0,
        2,
        ['example.com'],
        []
      );
    });

    it('应该正确返回队列大小', () => {
      expect(service.getQueueSize()).toBe(3);
      
      const link = service.getNextLink();
      service.markAsProcessed(link!.url);
      
      expect(service.getQueueSize()).toBe(2);
    });

    it('应该正确返回已处理数量', () => {
      expect(service.getProcessedCount()).toBe(0);
      
      const link = service.getNextLink();
      service.markAsProcessed(link!.url);
      
      expect(service.getProcessedCount()).toBe(1);
    });

    it('应该正确返回已发现数量', () => {
      expect(service.getDiscoveredCount()).toBe(3);
      
      service.addLinks(
        ['https://example.com/page4'],
        'https://example.com',
        0,
        2,
        ['example.com'],
        []
      );
      
      expect(service.getDiscoveredCount()).toBe(4);
    });

    it('应该返回完整的统计信息', () => {
      const link = service.getNextLink();
      service.markAsProcessed(link!.url);
      
      const stats = service.getStats();
      
      expect(stats.processed).toBe(1);
      expect(stats.discovered).toBe(3);
      expect(stats.queued).toBe(2);
      expect(stats.processedUrls).toContain(link!.url);
      expect(stats.processedUrls).toHaveLength(1);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空链接数组', () => {
      const addedCount = service.addLinks(
        [],
        'https://example.com',
        0,
        2,
        ['example.com'],
        []
      );
      
      expect(addedCount).toBe(0);
      expect(service.getDiscoveredCount()).toBe(0);
    });

    it('应该处理无效URL', () => {
      const addedCount = service.addLinks(
        ['invalid-url', 'not-a-url'],
        'https://example.com',
        0,
        2,
        ['example.com'],
        []
      );
      
      expect(addedCount).toBe(0);
      expect(service.getDiscoveredCount()).toBe(0);
    });

    it('应该处理空的允许域名列表', () => {
      const addedCount = service.addLinks(
        ['https://example.com/page1', 'https://other.com/page1'],
        'https://example.com',
        0,
        2,
        [], // 空的允许域名列表
        []
      );
      
      expect(addedCount).toBe(2); // 所有域名都被允许
      expect(service.getDiscoveredCount()).toBe(2);
    });

    it('应该处理复杂的排除模式', () => {
      const links = [
        'https://example.com/page1',
        'https://example.com/admin/users',
        'https://example.com/api/v1/data',
        'https://example.com/private/secret'
      ];
      const addedCount = service.addLinks(
        links,
        'https://example.com',
        0,
        2,
        ['example.com'],
        ['/admin/.*', '/api/.*', '/private/.*']
      );
      
      expect(addedCount).toBe(1); // 只有page1被添加
      expect(service.getDiscoveredCount()).toBe(1);
    });

    it('应该处理已处理链接的重复添加', () => {
      const url = 'https://example.com/page1';
      
      // 第一次添加
      service.addLinks([url], 'https://example.com', 0, 2, ['example.com'], []);
      expect(service.getDiscoveredCount()).toBe(1);
      
      // 标记为已处理
      service.markAsProcessed(url);
      
      // 再次尝试添加
      const addedCount = service.addLinks([url], 'https://example.com', 0, 2, ['example.com'], []);
      expect(addedCount).toBe(0); // 不应该重复添加
      expect(service.getDiscoveredCount()).toBe(1);
    });
  });
});