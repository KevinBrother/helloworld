import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageService } from './storage.service';
import * as Minio from 'minio';
import { PageData } from '../../shared/interfaces/crawler.interface';

// Mock MinIO
vi.mock('minio', () => ({
  Client: vi.fn(),
}));

describe('StorageService', () => {
  let service: StorageService;
  let module: TestingModule;
  let mockMinioClient: any;

  beforeEach(async () => {
    // 创建mock MinIO客户端
    mockMinioClient = {
      bucketExists: vi.fn(),
      makeBucket: vi.fn(),
      setBucketPolicy: vi.fn(),
      putObject: vi.fn(),
      getObject: vi.fn(),
      removeObject: vi.fn(),
      listObjects: vi.fn(),
      statObject: vi.fn(),
    };

    // Mock MinIO Client构造函数
    vi.mocked(Minio.Client).mockImplementation(() => mockMinioClient);

    // Mock环境变量
    process.env.MINIO_ENDPOINT = 'localhost';
    process.env.MINIO_PORT = '9000';
    process.env.MINIO_ACCESS_KEY = 'test-access-key';
    process.env.MINIO_SECRET_KEY = 'test-secret-key';
    process.env.MINIO_BUCKET_NAME = 'test-bucket';

    module = await Test.createTestingModule({
      providers: [StorageService],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  afterEach(async () => {
    await module.close();
    vi.clearAllMocks();
    // 清理环境变量
    delete process.env.MINIO_ENDPOINT;
    delete process.env.MINIO_PORT;
    delete process.env.MINIO_ACCESS_KEY;
    delete process.env.MINIO_SECRET_KEY;
    delete process.env.MINIO_BUCKET_NAME;
  });

  describe('基础功能测试', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('应该能够获取存储桶名称', () => {
      const bucketName = service.getBucketName();
      expect(bucketName).toBe('crawler-pages');
    });

    it('应该能够获取MinIO客户端', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      
      const client = await service.getClient();
      expect(client).toBe(mockMinioClient);
    });
  });

  describe('MinIO连接测试', () => {
    it('应该能够初始化MinIO客户端', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      
      await service.getClient();
      
      expect(Minio.Client).toHaveBeenCalledWith({
        endPoint: 'localhost',
        port: 9000,
        useSSL: false,
        accessKey: 'test-access-key',
        secretKey: 'test-secret-key',
      });
    });

    it('应该能够创建不存在的存储桶', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);
      mockMinioClient.makeBucket.mockResolvedValue(undefined);
      
      await service.getClient();
      
      const bucketName = service.getBucketName();
      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith(bucketName);
      expect(mockMinioClient.makeBucket).toHaveBeenCalledWith(bucketName, 'us-east-1');
    });

    it('应该能够处理存储桶检查失败', async () => {
      mockMinioClient.bucketExists.mockRejectedValue(new Error('Connection failed'));
      
      await expect(service.getClient()).rejects.toThrow('Connection failed');
    });

    it('应该能够处理存储桶创建失败', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);
      mockMinioClient.makeBucket.mockRejectedValue(new Error('Create bucket failed'));
      
      await expect(service.getClient()).rejects.toThrow('Create bucket failed');
    });
  });

  describe('文件操作测试', () => {
    const pageData: PageData = {
      url: 'https://example.com/some/page',
      title: 'Test Page',
      content: '<html><body>Test</body></html>',
      metadata: {
        depth: 1,
        parentUrl: 'https://example.com',
        crawledAt: '2023-01-01',
        statusCode: 200,
      },
    };
    const sessionId = 'test-session';

    beforeEach(async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      const mockStream = {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from(JSON.stringify({ mappings: {}, size: { screenshot: 0 } })));
          } else if (event === 'end') {
            callback();
          }
        }),
      };
      mockMinioClient.getObject.mockResolvedValue(mockStream);
    });

    it('应该能够保存页面数据', async () => {
      mockMinioClient.putObject.mockResolvedValue({ etag: 'test-etag' });
      
      const result = await service.savePageData(pageData, sessionId);
      
      expect(mockMinioClient.putObject).toHaveBeenCalledTimes(3);
      expect(result).toContain('example.com');
      expect(result).toContain('some/page');
    });

    it('应该能够保存截图', async () => {
        const screenshot = Buffer.from('fake-screenshot');
        mockMinioClient.putObject.mockResolvedValue({ etag: 'test-etag' });

        const result = await service.saveScreenshot(screenshot, pageData.url, sessionId);

        expect(mockMinioClient.putObject).toHaveBeenCalledTimes(2);
        expect(result).toContain('index.png');
    });

    it('应该能够保存会话元数据', async () => {
        const sessionMetadata = { session: { startUrl: 'https://example.com' } };
        mockMinioClient.putObject.mockResolvedValue({ etag: 'test-etag' });

        const result = await service.saveSessionMetadata(sessionId, sessionMetadata);

        expect(mockMinioClient.putObject).toHaveBeenCalledOnce();
        expect(result).toContain(`session-${sessionId}.json`);
    });
  });

  describe('异常处理测试', () => {
    it('应该能够处理保存页面数据失败', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockRejectedValue(new Error('Save failed'));
      
      await expect(
        service.savePageData({} as PageData, 'session-1')
      ).rejects.toThrow('Save failed');
    });
  });

  describe('性能和资源管理测试', () => {
    it('应该能够重用已初始化的客户端', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      
      const client1 = await service.getClient();
      const client2 = await service.getClient();
      
      expect(client1).toBe(client2);
      expect(Minio.Client).toHaveBeenCalledTimes(1);
    });
  });
});