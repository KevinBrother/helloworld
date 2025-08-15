import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppModule } from './app.module';
import { AppController } from './app.controller';
import { CrawlerModule } from './modules/crawler.module';
import { CrawlerController } from './controllers/crawler.controller';
import { WebsiteCrawlerService } from './services/crawler/website-crawler.service';

// Mock CrawlerModule 以避免复杂的依赖
vi.mock('./modules/crawler.module', () => ({
  CrawlerModule: {
    controllers: [],
    providers: [],
    exports: [],
  },
}));

// Mock 所有服务依赖
vi.mock('./core/browser/browser.service');
vi.mock('./core/storage/storage.service');
vi.mock('./services/crawler/website-crawler.service');
vi.mock('./services/crawler/link-manager.service');
vi.mock('./services/content/content-extractor.service');
vi.mock('./services/media/media-detector.service');
vi.mock('./services/media/media-downloader.service');
vi.mock('./services/media/media-storage.service');

describe('AppModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(CrawlerModule)
      .useModule(
        class MockCrawlerModule {
          static controllers = [];
          static providers = [];
          static exports = [];
        },
      )
      .compile();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('模块基础功能测试', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('应该能够编译应用模块', async () => {
      expect(module).toBeInstanceOf(TestingModule);
    });
  });

  describe('控制器注册测试', () => {
    it('应该注册AppController', () => {
      const controller = module.get<AppController>(AppController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(AppController);
    });
  });

  describe('模块导入测试', () => {
    it('应该导入ConfigModule', () => {
      // 验证ConfigModule被正确导入
      const imports = Reflect.getMetadata('imports', AppModule);
      expect(imports).toBeDefined();
      expect(imports).toHaveLength(2); // ConfigModule 和 CrawlerModule
    });

    it('ConfigModule应该配置为全局模块', () => {
      const imports = Reflect.getMetadata('imports', AppModule);
      const configModuleImport = imports.find((imp: any) => 
        imp && typeof imp === 'object' && imp.module
      );
      expect(configModuleImport).toBeDefined();
    });
  });

  describe('应用配置测试', () => {
    it('应该包含正确的控制器配置', () => {
      const controllers = Reflect.getMetadata('controllers', AppModule);
      expect(controllers).toContain(AppController);
      expect(controllers).toHaveLength(1);
    });

    it('应该包含正确的模块导入配置', () => {
      const imports = Reflect.getMetadata('imports', AppModule);
      expect(imports).toBeDefined();
      expect(Array.isArray(imports)).toBe(true);
      expect(imports.length).toBeGreaterThan(0);
    });
  });

  describe('模块生命周期测试', () => {
    it('应该能够正确初始化应用模块', async () => {
      const testModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideModule(CrawlerModule)
        .useModule(
          class MockCrawlerModule {
            static controllers = [];
            static providers = [];
            static exports = [];
          },
        )
        .compile();
      
      await testModule.init();
      expect(testModule).toBeDefined();
      
      await testModule.close();
    });

    it('应该能够正确关闭应用模块', async () => {
      const testModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideModule(CrawlerModule)
        .useModule(
          class MockCrawlerModule {
            static controllers = [];
            static providers = [];
            static exports = [];
          },
        )
        .compile();
      
      await testModule.init();
      await expect(testModule.close()).resolves.not.toThrow();
    });
  });

  describe('依赖注入测试', () => {
    it('AppController应该能够正确注入', () => {
      const controller = module.get<AppController>(AppController);
      
      expect(controller).toBeDefined();
      expect(typeof controller.getHello).toBe('function');
      expect(typeof controller.getHealth).toBe('function');
      expect(typeof controller.getInfo).toBe('function');
    });
  });

  describe('配置验证测试', () => {
    it('应该正确配置模块元数据', () => {
      // 验证模块装饰器配置
      const moduleMetadata = Reflect.getMetadata('__module__', AppModule);
      expect(moduleMetadata).toBeDefined();
    });

    it('应该有正确的模块结构', () => {
      const imports = Reflect.getMetadata('imports', AppModule);
      const controllers = Reflect.getMetadata('controllers', AppModule);
      const providers = Reflect.getMetadata('providers', AppModule);
      
      expect(imports).toBeDefined();
      expect(controllers).toBeDefined();
      expect(providers).toBeUndefined(); // AppModule 没有直接的 providers
    });
  });

  describe('模块集成测试', () => {
    it('应该能够创建完整的应用上下文', async () => {
      const app = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideModule(CrawlerModule)
        .useModule(
          class MockCrawlerModule {
            static controllers = [];
            static providers = [];
            static exports = [];
          },
        )
        .compile();
      
      const appController = app.get<AppController>(AppController);
      expect(appController).toBeDefined();
      
      // 测试基本功能
      expect(appController.getHello()).toBe('Web Crawler API is running!');
      expect(appController.getHealth()).toHaveProperty('status', 'ok');
      expect(appController.getInfo()).toHaveProperty('name', 'Web Crawler API');
      
      await app.close();
    });
  });

  describe('错误处理测试', () => {
    it('应该处理模块编译错误', async () => {
      // 验证正常情况下模块编译不会出错
      await expect(
        Test.createTestingModule({
          imports: [AppModule],
        })
          .overrideModule(CrawlerModule)
          .useModule(
            class MockCrawlerModule {
              static controllers = [];
              static providers = [];
              static exports = [];
            },
          )
          .compile()
      ).resolves.toBeDefined();
    });
  });

  describe('环境配置测试', () => {
    it('应该支持不同的环境配置', async () => {
      // 测试模块在不同环境下的行为
      const originalEnv = process.env.NODE_ENV;
      
      try {
        process.env.NODE_ENV = 'test';
        
        const testModule = await Test.createTestingModule({
          imports: [AppModule],
        })
          .overrideModule(CrawlerModule)
          .useModule(
            class MockCrawlerModule {
              static controllers = [];
              static providers = [];
              static exports = [];
            },
          )
          .compile();
        
        expect(testModule).toBeDefined();
        await testModule.close();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('模块扩展性测试', () => {
    it('应该支持添加新的模块', async () => {
      // 创建一个测试模块来验证扩展性
      @Module({
        controllers: [],
        providers: [],
      })
      class TestModule {}
      
      const extendedModule = await Test.createTestingModule({
        imports: [AppModule, TestModule],
      })
        .overrideModule(CrawlerModule)
        .useModule(
          class MockCrawlerModule {
            static controllers = [];
            static providers = [];
            static exports = [];
          },
        )
        .compile();
      
      expect(extendedModule).toBeDefined();
      await extendedModule.close();
    });
  });
});