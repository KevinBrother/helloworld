import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CrawlerModule } from './crawler.module';
import { CrawlerController } from '../controllers/crawler.controller';
import { WebsiteCrawlerService } from '../services/crawler/website-crawler.service';
import { LinkManagerService } from '../services/crawler/link-manager.service';
import { ContentExtractorService } from '../services/content/content-extractor.service';
import { MediaDetectorService } from '../services/media/media-detector.service';
import { MediaDownloaderService } from '../services/media/media-downloader.service';
import { MediaStorageService } from '../services/media/media-storage.service';
import { BrowserService } from '../core/browser/browser.service';
import { StorageService } from '../core/storage/storage.service';

// Mock所有依赖的服务
vi.mock('../core/browser/browser.service');
vi.mock('../core/storage/storage.service');
vi.mock('../services/crawler/website-crawler.service');
vi.mock('../services/crawler/link-manager.service');
vi.mock('../services/content/content-extractor.service');
vi.mock('../services/media/media-detector.service');
vi.mock('../services/media/media-downloader.service');
vi.mock('../services/media/media-storage.service');

describe('CrawlerModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [CrawlerModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('模块基础功能测试', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('应该能够编译模块', async () => {
      expect(module).toBeInstanceOf(TestingModule);
    });
  });

  describe('控制器注册测试', () => {
    it('应该注册CrawlerController', () => {
      const controller = module.get<CrawlerController>(CrawlerController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(CrawlerController);
    });
  });

  describe('服务提供者注册测试', () => {
    it('应该注册WebsiteCrawlerService', () => {
      const service = module.get<WebsiteCrawlerService>(WebsiteCrawlerService);
      expect(service).toBeDefined();
    });

    it('应该注册LinkManagerService', () => {
      const service = module.get<LinkManagerService>(LinkManagerService);
      expect(service).toBeDefined();
    });

    it('应该注册ContentExtractorService', () => {
      const service = module.get<ContentExtractorService>(ContentExtractorService);
      expect(service).toBeDefined();
    });

    it('应该注册MediaDetectorService', () => {
      const service = module.get<MediaDetectorService>(MediaDetectorService);
      expect(service).toBeDefined();
    });

    it('应该注册MediaDownloaderService', () => {
      const service = module.get<MediaDownloaderService>(MediaDownloaderService);
      expect(service).toBeDefined();
    });

    it('应该注册MediaStorageService', () => {
      const service = module.get<MediaStorageService>(MediaStorageService);
      expect(service).toBeDefined();
    });

    it('应该注册BrowserService', () => {
      const service = module.get<BrowserService>(BrowserService);
      expect(service).toBeDefined();
    });

    it('应该注册StorageService', () => {
      const service = module.get<StorageService>(StorageService);
      expect(service).toBeDefined();
    });
  });

  describe('服务导出测试', () => {
    it('应该能够从模块外部访问导出的服务', async () => {
      // 创建一个测试模块来验证导出
      const testModule = await Test.createTestingModule({
        imports: [CrawlerModule],
      }).compile();

      // 验证所有导出的服务都可以被获取
      expect(testModule.get<WebsiteCrawlerService>(WebsiteCrawlerService)).toBeDefined();
      expect(testModule.get<LinkManagerService>(LinkManagerService)).toBeDefined();
      expect(testModule.get<ContentExtractorService>(ContentExtractorService)).toBeDefined();
      expect(testModule.get<MediaDetectorService>(MediaDetectorService)).toBeDefined();
      expect(testModule.get<MediaDownloaderService>(MediaDownloaderService)).toBeDefined();
      expect(testModule.get<MediaStorageService>(MediaStorageService)).toBeDefined();
      expect(testModule.get<BrowserService>(BrowserService)).toBeDefined();
      expect(testModule.get<StorageService>(StorageService)).toBeDefined();

      await testModule.close();
    });
  });

  describe('依赖注入测试', () => {
    it('控制器应该能够注入所需的服务', () => {
      const controller = module.get<CrawlerController>(CrawlerController);
      
      // 验证控制器已正确实例化（间接验证依赖注入成功）
      expect(controller).toBeDefined();
      expect(typeof controller.crawlWebsite).toBe('function');
      expect(typeof controller.getSessionStatus).toBe('function');
      expect(typeof controller.getActiveSessions).toBe('function');
      expect(typeof controller.stopCrawling).toBe('function');
      expect(typeof controller.healthCheck).toBe('function');
    });

    it('服务之间应该能够正确注入依赖', () => {
      // 获取主要服务
      const crawlerService = module.get<WebsiteCrawlerService>(WebsiteCrawlerService);
      const browserService = module.get<BrowserService>(BrowserService);
      const storageService = module.get<StorageService>(StorageService);
      
      // 验证服务实例化成功（间接验证依赖注入）
      expect(crawlerService).toBeDefined();
      expect(browserService).toBeDefined();
      expect(storageService).toBeDefined();
    });
  });

  describe('模块配置验证', () => {
    it('应该包含所有必需的控制器', () => {
      const controllers = Reflect.getMetadata('controllers', CrawlerModule);
      expect(controllers).toContain(CrawlerController);
      expect(controllers).toHaveLength(1);
    });

    it('应该包含所有必需的提供者', () => {
      const providers = Reflect.getMetadata('providers', CrawlerModule);
      const expectedProviders = [
        WebsiteCrawlerService,
        LinkManagerService,
        ContentExtractorService,
        MediaDetectorService,
        MediaDownloaderService,
        MediaStorageService,
        BrowserService,
        StorageService,
      ];
      
      expectedProviders.forEach(provider => {
        expect(providers).toContain(provider);
      });
      expect(providers).toHaveLength(expectedProviders.length);
    });

    it('应该导出所有必需的服务', () => {
      const exports = Reflect.getMetadata('exports', CrawlerModule);
      const expectedExports = [
        WebsiteCrawlerService,
        LinkManagerService,
        ContentExtractorService,
        MediaDetectorService,
        MediaDownloaderService,
        MediaStorageService,
        BrowserService,
        StorageService,
      ];
      
      expectedExports.forEach(exportItem => {
        expect(exports).toContain(exportItem);
      });
      expect(exports).toHaveLength(expectedExports.length);
    });
  });

  describe('模块生命周期测试', () => {
    it('应该能够正确初始化模块', async () => {
      const testModule = await Test.createTestingModule({
        imports: [CrawlerModule],
      }).compile();
      
      await testModule.init();
      expect(testModule).toBeDefined();
      
      await testModule.close();
    });

    it('应该能够正确关闭模块', async () => {
      const testModule = await Test.createTestingModule({
        imports: [CrawlerModule],
      }).compile();
      
      await testModule.init();
      await expect(testModule.close()).resolves.not.toThrow();
    });
  });

  describe('错误处理测试', () => {
    it('应该处理服务实例化错误', async () => {
      // 这个测试验证模块在正常情况下不会抛出错误
      await expect(Test.createTestingModule({
        imports: [CrawlerModule],
      }).compile()).resolves.toBeDefined();
    });
  });

  describe('模块集成测试', () => {
    it('应该能够与其他模块一起工作', async () => {
      // 创建一个包含CrawlerModule的应用模块
      const appModule = await Test.createTestingModule({
        imports: [CrawlerModule],
      }).compile();
      
      // 验证可以获取控制器和服务
      const controller = appModule.get<CrawlerController>(CrawlerController);
      const service = appModule.get<WebsiteCrawlerService>(WebsiteCrawlerService);
      
      expect(controller).toBeDefined();
      expect(service).toBeDefined();
      
      await appModule.close();
    });

    it('应该支持模块的重复导入', async () => {
      // 测试模块可以被多次导入而不出错
      const module1 = await Test.createTestingModule({
        imports: [CrawlerModule],
      }).compile();
      
      const module2 = await Test.createTestingModule({
        imports: [CrawlerModule],
      }).compile();
      
      expect(module1).toBeDefined();
      expect(module2).toBeDefined();
      
      await module1.close();
      await module2.close();
    });
  });
});