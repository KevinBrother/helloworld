import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MediaDownloaderService } from './media-downloader.service';
import { StorageService } from '../../core/storage/storage.service';
import { MediaFileInfo, MediaCrawlOptions } from '../../shared/interfaces/crawler.interface';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('MediaDownloaderService', () => {
  let service: MediaDownloaderService;
  let mockStorageService: any;

  const mockMediaFile: MediaFileInfo = {
    url: 'https://example.com/image.jpg',
    type: 'image',
    extension: 'jpg',
    fileName: 'test-image.jpg',
    sourceUrl: 'https://example.com/page.html',
  };

  const mockOptions: MediaCrawlOptions = {
    enabled: true,
    mediaTypes: [{ type: 'image', mode: 'inherit' }],
    concurrent: 3,
    maxFileSize: 50,
    downloadTimeout: 30
  };

  beforeEach(async () => {
    mockStorageService = {
      getClient: vi.fn().mockResolvedValue({
        putObject: vi.fn().mockResolvedValue({ etag: 'test-etag' }),
      }),
      getBucketName: vi.fn().mockReturnValue('test-bucket'),
    };

    // 直接创建服务实例而不是使用 NestJS 测试模块
    service = new MediaDownloaderService(mockStorageService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('downloadMediaFiles', () => {
    it('should download a single file successfully', async () => {
      const mockHeadResponse = { 
        headers: { 'content-length': '1024' },
        status: 200
      };
      const mockGetResponse = { 
        data: Buffer.from('fake image data'), 
        headers: { 'content-type': 'image/jpeg' }, 
        status: 200 
      };

      // 确保axios mock正确配置
      mockedAxios.head.mockResolvedValueOnce(mockHeadResponse);
      mockedAxios.get.mockResolvedValueOnce(mockGetResponse);

      // 确保storageService mock正确配置
      mockStorageService.getClient.mockResolvedValueOnce({
        putObject: vi.fn().mockResolvedValue({ etag: 'test-etag' })
      });
      mockStorageService.getBucketName.mockReturnValueOnce('test-bucket');

      const results = await service.downloadMediaFiles([mockMediaFile], 'test-session', mockOptions);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].mediaFile).toBeDefined();
      expect(results[0].mediaFile?.storagePath).toBeDefined();
    });

    it('should handle download failure', async () => {
      mockedAxios.head.mockRejectedValue(new Error('Network error'));

      const results = await service.downloadMediaFiles([mockMediaFile], 'test-session', mockOptions);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Network error');
    });

    it('should handle file size limit exceeded', async () => {
        const largeFileOptions: MediaCrawlOptions = { ...mockOptions, maxFileSize: 0.0001 }; // 0.1KB
        const mockHeadResponse = { headers: { 'content-length': '1024' } }; // 1KB
  
        mockedAxios.head.mockResolvedValue(mockHeadResponse);
  
        const results = await service.downloadMediaFiles([mockMediaFile], 'test-session', largeFileOptions);
  
        expect(results).toHaveLength(1);
        expect(results[0].success).toBe(false);
        expect(results[0].error).toContain('文件过大');
      });
  });
});
