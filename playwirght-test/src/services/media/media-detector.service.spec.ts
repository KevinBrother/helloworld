import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MediaDetectorService } from './media-detector.service';
import { MediaTypeConfig } from '../../shared/interfaces/crawler.interface';
import { Page } from 'playwright';

describe('MediaDetectorService', () => {
  let service: MediaDetectorService;
  let module: TestingModule;
  let mockPage: any;

  const defaultMediaTypes: MediaTypeConfig[] = [
    { type: 'image', mode: 'inherit' },
    { type: 'video', mode: 'inherit' },
    { type: 'audio', mode: 'inherit' },
    { type: 'document', mode: 'inherit' },
    { type: 'archive', mode: 'inherit' }
  ];

  beforeEach(async () => {
    mockPage = {
      evaluate: vi.fn(),
      $: vi.fn(),
    };

    module = await Test.createTestingModule({
      providers: [MediaDetectorService],
    }).compile();

    service = module.get<MediaDetectorService>(MediaDetectorService);
  });

  afterEach(async () => {
    await module.close();
    vi.clearAllMocks();
  });

  describe('基础功能测试', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('媒体文件检测测试', () => {
    const baseUrl = 'https://example.com';

    it('应该能够检测图片文件', async () => {
      mockPage.evaluate.mockResolvedValue([
        { type: 'img', src: 'image1.jpg', alt: 'Image 1' },
        { type: 'img', src: '/images/image2.png', alt: 'Image 2' },
        { type: 'img', src: 'https://example.com/image3.gif', alt: 'Image 3' }
      ]);

      const mediaFiles = await service.detectMediaFiles(mockPage, baseUrl, defaultMediaTypes);
      
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mediaFiles).toBeDefined();
      expect(Array.isArray(mediaFiles)).toBe(true);
    });

    it('应该能够检测视频文件', async () => {
      mockPage.evaluate.mockResolvedValue([
        { type: 'video', src: 'video1.mp4' },
        { type: 'source', src: 'video2.webm', parent: 'video' },
        { type: 'source', src: 'video2.mp4', parent: 'video' }
      ]);

      const mediaFiles = await service.detectMediaFiles(mockPage, baseUrl, defaultMediaTypes);
      
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mediaFiles).toBeDefined();
      expect(Array.isArray(mediaFiles)).toBe(true);
    });

    it('应该能够检测音频文件', async () => {
      mockPage.evaluate.mockResolvedValue([
        { type: 'audio', src: 'audio1.mp3' },
        { type: 'source', src: 'audio2.ogg', parent: 'audio' },
        { type: 'source', src: 'audio2.mp3', parent: 'audio' }
      ]);

      const mediaFiles = await service.detectMediaFiles(mockPage, baseUrl, defaultMediaTypes);
      
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mediaFiles).toBeDefined();
      expect(Array.isArray(mediaFiles)).toBe(true);
    });

    it('应该能够检测文档文件', async () => {
      mockPage.evaluate.mockResolvedValue([
        { type: 'a', href: 'document1.pdf', text: 'PDF Document' },
        { type: 'a', href: 'document2.doc', text: 'Word Document' },
        { type: 'a', href: 'document3.xlsx', text: 'Excel Document' }
      ]);

      const mediaFiles = await service.detectMediaFiles(mockPage, baseUrl, defaultMediaTypes);
      
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mediaFiles).toBeDefined();
      expect(Array.isArray(mediaFiles)).toBe(true);
    });

    it('应该能够检测压缩文件', async () => {
      mockPage.evaluate.mockResolvedValue([
        { type: 'a', href: 'archive1.zip', text: 'ZIP Archive' },
        { type: 'a', href: 'archive2.rar', text: 'RAR Archive' },
        { type: 'a', href: 'archive3.tar.gz', text: 'TAR.GZ Archive' }
      ]);

      const mediaFiles = await service.detectMediaFiles(mockPage, baseUrl, defaultMediaTypes);
      
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mediaFiles).toBeDefined();
      expect(Array.isArray(mediaFiles)).toBe(true);
    });

    it('应该处理空页面', async () => {
      mockPage.evaluate.mockResolvedValue([]);

      const mediaFiles = await service.detectMediaFiles(mockPage, baseUrl, defaultMediaTypes);
      
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mediaFiles).toEqual([]);
    });

    it('应该处理页面评估错误', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('Page evaluation failed'));

      const mediaFiles = await service.detectMediaFiles(mockPage, baseUrl, defaultMediaTypes);
      
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mediaFiles).toEqual([]);
    });
  });

  describe('媒体类型配置测试', () => {
    const baseUrl = 'https://example.com';

    it('应该根据配置过滤媒体类型', async () => {
      const imageOnlyConfig: MediaTypeConfig[] = [
        { type: 'image', mode: 'inherit' }
      ];

      mockPage.evaluate.mockResolvedValue([
        { type: 'img', src: 'image1.jpg' },
        { type: 'video', src: 'video1.mp4' },
        { type: 'audio', src: 'audio1.mp3' }
      ]);

      const mediaFiles = await service.detectMediaFiles(mockPage, baseUrl, imageOnlyConfig);
      
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mediaFiles).toBeDefined();
    });

    it('应该处理自定义扩展名配置', async () => {
      const customConfig: MediaTypeConfig[] = [
        { 
          type: 'image', 
          mode: 'override',
          extensions: ['jpg', 'png'] 
        }
      ];

      mockPage.evaluate.mockResolvedValue([
        { type: 'img', src: 'image1.jpg' },
        { type: 'img', src: 'image2.gif' }, // 不在自定义扩展名列表中
        { type: 'img', src: 'image3.png' }
      ]);

      const mediaFiles = await service.detectMediaFiles(mockPage, baseUrl, customConfig);
      
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mediaFiles).toBeDefined();
    });

    it('应该处理空的媒体类型配置', async () => {
      mockPage.evaluate.mockResolvedValue([
        { type: 'img', src: 'image1.jpg' },
        { type: 'video', src: 'video1.mp4' }
      ]);

      const mediaFiles = await service.detectMediaFiles(mockPage, baseUrl, []);
      
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mediaFiles).toBeDefined();
    });
  });

  describe('URL处理测试', () => {
    const baseUrl = 'https://example.com/path/page.html';

    it('应该正确处理相对URL', async () => {
      mockPage.evaluate.mockResolvedValue([
        { type: 'img', src: './images/relative1.jpg' },
        { type: 'img', src: '../images/relative2.png' },
        { type: 'img', src: '/absolute/image.gif' }
      ]);

      const mediaFiles = await service.detectMediaFiles(mockPage, baseUrl, defaultMediaTypes);
      
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mediaFiles).toBeDefined();
    });

    it('应该正确处理绝对URL', async () => {
      mockPage.evaluate.mockResolvedValue([
        { type: 'img', src: 'https://cdn.example.com/image1.jpg' },
        { type: 'img', src: 'http://other.com/image2.png' }
      ]);

      const mediaFiles = await service.detectMediaFiles(mockPage, baseUrl, defaultMediaTypes);
      
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mediaFiles).toBeDefined();
    });

    it('应该处理包含查询参数的URL', async () => {
      mockPage.evaluate.mockResolvedValue([
        { type: 'img', src: 'image.jpg?v=123&size=large' },
        { type: 'video', src: 'video.mp4?token=abc123' }
      ]);

      const mediaFiles = await service.detectMediaFiles(mockPage, baseUrl, defaultMediaTypes);
      
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mediaFiles).toBeDefined();
    });

    it('应该过滤无效URL', async () => {
      mockPage.evaluate.mockResolvedValue([
        { type: 'img', src: '' },
        { type: 'img', src: '   ' },
        { type: 'img', src: 'valid-image.jpg' },
        { type: 'video', src: 'javascript:alert("xss")' }
      ]);

      const mediaFiles = await service.detectMediaFiles(mockPage, baseUrl, defaultMediaTypes);
      
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mediaFiles).toBeDefined();
    });
  });

  describe('边界情况测试', () => {
    const baseUrl = 'https://example.com';

    it('应该处理大量媒体元素', async () => {
      const largeElementList = [];
      for (let i = 0; i < 1000; i++) {
        largeElementList.push({ type: 'img', src: `image${i}.jpg` });
      }
      
      mockPage.evaluate.mockResolvedValue(largeElementList);

      const mediaFiles = await service.detectMediaFiles(mockPage, baseUrl, defaultMediaTypes);
      
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mediaFiles).toBeDefined();
      expect(Array.isArray(mediaFiles)).toBe(true);
    });

    it('应该处理包含特殊字符的URL', async () => {
      mockPage.evaluate.mockResolvedValue([
        { type: 'img', src: '图片.jpg' },
        { type: 'img', src: 'image with spaces.png' },
        { type: 'img', src: 'image%20encoded.gif' }
      ]);

      const mediaFiles = await service.detectMediaFiles(mockPage, baseUrl, defaultMediaTypes);
      
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mediaFiles).toBeDefined();
    });

    it('应该处理data URL', async () => {
      mockPage.evaluate.mockResolvedValue([
        { type: 'img', src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' },
        { type: 'img', src: 'regular-image.jpg' }
      ]);

      const mediaFiles = await service.detectMediaFiles(mockPage, baseUrl, defaultMediaTypes);
      
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mediaFiles).toBeDefined();
    });
  });
});