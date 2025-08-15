import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MediaStorageService } from './media-storage.service';
import { StorageService } from '../../core/storage/storage.service';
import { MediaFileInfo } from '../../shared/interfaces/crawler.interface';

// Mock PathGenerator
vi.mock('../../shared/utils/path-generator.util', () => ({
  PathGenerator: {
    generateSessionPath: vi.fn().mockReturnValue('/sessions/test-session')
  }
}));

describe('MediaStorageService', () => {
  let service: MediaStorageService;
  let module: TestingModule;
  let mockStorageService: any;
  let mockMinioClient: any;

  const mockMediaFile: MediaFileInfo = {
    url: 'https://example.com/image.jpg',
    type: 'image',
    extension: 'jpg',
    fileName: 'test-image.jpg',
    sourceUrl: 'https://example.com/page.html',
    size: 1024000,
    storagePath: '/sessions/test-session/media/test-image.jpg',
    md5Hash: 'abc123def456',
    downloadedAt: '2024-01-01T00:00:00.000Z',
    metadata: {
      alt: 'Test image',
      title: 'Test title'
    }
  };

  const mockMediaFiles: MediaFileInfo[] = [
    mockMediaFile,
    {
      ...mockMediaFile,
      url: 'https://example.com/video.mp4',
      type: 'video',
      extension: 'mp4',
      fileName: 'test-video.mp4'
    },
    {
      ...mockMediaFile,
      url: 'https://example.com/document.pdf',
      type: 'document',
      extension: 'pdf',
      fileName: 'test-document.pdf'
    }
  ];

  beforeEach(async () => {
    mockMinioClient = {
      presignedGetObject: vi.fn(),
      putObject: vi.fn()
    };

    mockStorageService = {
      getClient: vi.fn(),
      getBucketName: vi.fn(),
      saveFile: vi.fn().mockResolvedValue('/path/to/saved/file'),
      fileExists: vi.fn().mockResolvedValue(false),
      getFileMetadata: vi.fn().mockResolvedValue({}),
      deleteFile: vi.fn().mockResolvedValue(true)
    };

    module = await Test.createTestingModule({
      providers: [
        MediaStorageService,
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    service = module.get<MediaStorageService>(MediaStorageService);
  });

  afterEach(async () => {
    // 清理所有会话数据
    service.cleanupSession('test-session-123');
    service.cleanupSession('invalid-url-session');
    
    // 只清除 mockStorageService 和 mockMinioClient 的 mock
    mockStorageService.getClient.mockClear();
    mockStorageService.getBucketName.mockClear();
    mockStorageService.saveFile.mockClear();
    mockStorageService.fileExists.mockClear();
    mockStorageService.getFileMetadata.mockClear();
    mockStorageService.deleteFile.mockClear();
    mockMinioClient.putObject.mockClear();
    mockMinioClient.presignedGetObject.mockClear();
    await module.close();
  });

  describe('基础功能测试', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('媒体文件保存和获取测试', () => {
    const sessionId = 'test-session-123';

    it('应该能够保存媒体文件到会话', () => {
      service.saveMediaFilesToSession(sessionId, mockMediaFiles);
      
      const savedFiles = service.getSessionMediaFiles(sessionId);
      expect(savedFiles).toHaveLength(3);
      expect(savedFiles[0].fileName).toBe('test-image.jpg');
      expect(savedFiles[1].fileName).toBe('test-video.mp4');
      expect(savedFiles[2].fileName).toBe('test-document.pdf');
    });

    it('应该能够获取空会话的媒体文件', () => {
      const files = service.getSessionMediaFiles('non-existent-session');
      expect(files).toEqual([]);
    });

    it('应该能够追加媒体文件到现有会话', () => {
      // 先保存一些文件
      service.saveMediaFilesToSession(sessionId, [mockMediaFile]);
      
      // 再追加更多文件
      const additionalFiles = mockMediaFiles.slice(1);
      service.saveMediaFilesToSession(sessionId, additionalFiles);
      
      const allFiles = service.getSessionMediaFiles(sessionId);
      expect(allFiles).toHaveLength(3);
    });

    it('应该去重相同的媒体文件', () => {
      const duplicateFiles = [
        mockMediaFile,
        { ...mockMediaFile }, // 完全相同的文件
        { ...mockMediaFile, fileName: 'different-name.jpg' } // URL相同但文件名不同
      ];
      
      service.saveMediaFilesToSession(sessionId, duplicateFiles);
      
      const savedFiles = service.getSessionMediaFiles(sessionId);
      // 应该只保存一个文件，因为URL和sourceUrl相同
      expect(savedFiles).toHaveLength(1);
    });
  });

  describe('媒体文件查询测试', () => {
    const sessionId = 'test-session-query';

    beforeEach(() => {
      service.saveMediaFilesToSession(sessionId, mockMediaFiles);
    });

    it('应该能够按类型获取媒体文件', () => {
      const imageFiles = service.getMediaFilesByType(sessionId, 'image');
      const videoFiles = service.getMediaFilesByType(sessionId, 'video');
      const documentFiles = service.getMediaFilesByType(sessionId, 'document');
      
      expect(imageFiles).toHaveLength(1);
      expect(imageFiles[0].type).toBe('image');
      expect(videoFiles).toHaveLength(1);
      expect(videoFiles[0].type).toBe('video');
      expect(documentFiles).toHaveLength(1);
      expect(documentFiles[0].type).toBe('document');
    });

    it('应该能够按扩展名获取媒体文件', () => {
      const jpgFiles = service.getMediaFilesByExtension(sessionId, 'jpg');
      const mp4Files = service.getMediaFilesByExtension(sessionId, 'mp4');
      const pdfFiles = service.getMediaFilesByExtension(sessionId, 'pdf');
      
      expect(jpgFiles).toHaveLength(1);
      expect(jpgFiles[0].extension).toBe('jpg');
      expect(mp4Files).toHaveLength(1);
      expect(mp4Files[0].extension).toBe('mp4');
      expect(pdfFiles).toHaveLength(1);
      expect(pdfFiles[0].extension).toBe('pdf');
    });

    it('应该能够按文件名获取特定媒体文件', () => {
      const file = service.getMediaFile(sessionId, 'test-image.jpg');
      
      expect(file).toBeDefined();
      expect(file?.fileName).toBe('test-image.jpg');
      expect(file?.type).toBe('image');
    });

    it('应该在文件不存在时返回null', () => {
      const file = service.getMediaFile(sessionId, 'non-existent.jpg');
      
      expect(file).toBeNull();
    });

    it('应该能够搜索媒体文件', () => {
      // 按类型搜索
      const imageResults = service.searchMediaFiles(sessionId, { type: 'image' });
      expect(imageResults).toHaveLength(1);
      expect(imageResults[0].type).toBe('image');
      
      // 按扩展名搜索
      const jpgResults = service.searchMediaFiles(sessionId, { extension: 'jpg' });
      expect(jpgResults).toHaveLength(1);
      expect(jpgResults[0].extension).toBe('jpg');
      
      // 按文件名搜索
      const nameResults = service.searchMediaFiles(sessionId, { fileName: 'test-image.jpg' });
      expect(nameResults).toHaveLength(1);
      expect(nameResults[0].fileName).toBe('test-image.jpg');
      
      // 按源URL搜索
      const urlResults = service.searchMediaFiles(sessionId, { sourceUrl: 'https://example.com/page.html' });
      expect(urlResults).toHaveLength(3); // 所有文件都来自同一个源URL
      
      // 按文件大小搜索
      const sizeResults = service.searchMediaFiles(sessionId, { minSize: 500000, maxSize: 2000000 });
      expect(sizeResults).toHaveLength(3); // 所有文件都在这个大小范围内
      
      // 组合搜索
      const combinedResults = service.searchMediaFiles(sessionId, {
        type: 'image',
        extension: 'jpg',
        minSize: 1000000
      });
      expect(combinedResults).toHaveLength(1);
    });

    it('应该在搜索无结果时返回空数组', () => {
      const results = service.searchMediaFiles(sessionId, { type: 'audio' });
      expect(results).toEqual([]);
    });
  });

  describe('统计信息测试', () => {
    it('应该能够获取所有媒体文件统计', () => {
      const session1 = 'session-1';
      const session2 = 'session-2';
      
      service.saveMediaFilesToSession(session1, mockMediaFiles.slice(0, 2));
      service.saveMediaFilesToSession(session2, mockMediaFiles.slice(2));
      
      const stats = service.getAllMediaFilesStats();
      
      expect(stats.totalSessions).toBe(2);
      expect(stats.totalFiles).toBe(3);
      expect(stats.filesByType).toHaveProperty('image', 1);
      expect(stats.filesByType).toHaveProperty('video', 1);
      expect(stats.filesByType).toHaveProperty('document', 1);
      expect(stats.filesBySession).toHaveProperty(session1, 2);
      expect(stats.filesBySession).toHaveProperty(session2, 1);
    });

    it('应该在没有会话时返回空统计', () => {
      const stats = service.getAllMediaFilesStats();
      
      expect(stats.totalSessions).toBe(0);
      expect(stats.totalFiles).toBe(0);
      expect(stats.filesByType).toEqual({});
      expect(stats.filesBySession).toEqual({});
    });
  });

  describe('下载URL生成测试', () => {
    const sessionId = 'test-session-download';

    beforeEach(() => {
      service.saveMediaFilesToSession(sessionId, [mockMediaFile]);
    });

    it('应该能够生成媒体文件下载URL', async () => {
      // 为这个测试用例配置mock
      mockStorageService.getClient.mockResolvedValueOnce(mockMinioClient);
      mockStorageService.getBucketName.mockReturnValueOnce('test-bucket');
      mockMinioClient.presignedGetObject.mockResolvedValueOnce('https://presigned-url.example.com');
      
      const downloadUrl = await service.getMediaFileDownloadUrl(sessionId, 'test-image.jpg');
      
      expect(downloadUrl).toBe('https://presigned-url.example.com');
      expect(mockStorageService.getClient).toHaveBeenCalled();
      expect(mockStorageService.getBucketName).toHaveBeenCalled();
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        'test-bucket',
        '/sessions/test-session/media/test-image.jpg',
        3600 // 1小时
      );
    });

    it('应该在文件不存在时返回null', async () => {
      const downloadUrl = await service.getMediaFileDownloadUrl(sessionId, 'non-existent.jpg');
      
      expect(downloadUrl).toBeNull();
      expect(mockStorageService.getClient).not.toHaveBeenCalled();
    });

    it('应该在文件没有存储路径时返回null', async () => {
      const fileWithoutPath: MediaFileInfo = {
        ...mockMediaFile,
        fileName: 'no-path.jpg',
        storagePath: undefined
      };
      
      service.saveMediaFilesToSession(sessionId, [fileWithoutPath]);
      
      const downloadUrl = await service.getMediaFileDownloadUrl(sessionId, 'no-path.jpg');
      
      expect(downloadUrl).toBeNull();
    });

    it('应该处理MinIO客户端错误', async () => {
      // 为这个测试用例配置mock
      mockStorageService.getClient.mockResolvedValueOnce(mockMinioClient);
      mockStorageService.getBucketName.mockReturnValueOnce('test-bucket');
      mockMinioClient.presignedGetObject.mockRejectedValueOnce(new Error('MinIO error'));
      
      const downloadUrl = await service.getMediaFileDownloadUrl(sessionId, 'test-image.jpg');
      
      expect(downloadUrl).toBeNull();
    });
  });

  describe('元数据保存测试', () => {
    const sessionId = 'test-session-metadata';

    beforeEach(() => {
      service.saveMediaFilesToSession(sessionId, mockMediaFiles);
    });

    it('应该能够保存媒体文件元数据', async () => {
      // 为这个测试用例配置mock
      mockStorageService.getClient.mockResolvedValueOnce(mockMinioClient);
      mockStorageService.getBucketName.mockReturnValueOnce('test-bucket');
      mockMinioClient.putObject.mockResolvedValueOnce({});
      
      const metadataPath = await service.saveMediaMetadata(sessionId, 'example.com');
      
      expect(metadataPath).toBeDefined();
      expect(metadataPath).toContain('media-metadata');
      expect(metadataPath).toContain(sessionId);
      expect(mockStorageService.getClient).toHaveBeenCalled();
      expect(mockMinioClient.putObject).toHaveBeenCalled();
      
      // 验证putObject调用的参数
      const putObjectCall = mockMinioClient.putObject.mock.calls[0];
      expect(putObjectCall[0]).toBe('test-bucket'); // bucketName
      expect(putObjectCall[1]).toContain('media-metadata'); // objectName
      expect(putObjectCall[2]).toBeInstanceOf(Buffer); // data
      expect(putObjectCall[4]).toHaveProperty('Content-Type', 'application/json'); // metadata
    });

    it('应该能够从媒体文件URL中提取域名', async () => {
      // 清理会话数据
      service.cleanupSession(sessionId);
      
      // 为这个测试用例配置mock
      mockStorageService.getClient.mockResolvedValueOnce(mockMinioClient);
      mockStorageService.getBucketName.mockReturnValueOnce('test-bucket');
      mockMinioClient.putObject.mockResolvedValueOnce({});
      
      // 先保存媒体文件到会话中
      service.saveMediaFilesToSession(sessionId, [mockMediaFile]);
      
      // 验证媒体文件已保存
      const savedFiles = service.getSessionMediaFiles(sessionId);
      expect(savedFiles).toHaveLength(1);
      
      const metadataPath = await service.saveMediaMetadata(sessionId); // 不提供域名
      
      expect(metadataPath).toBeDefined();
      expect(mockMinioClient.putObject).toHaveBeenCalled();
      
      // 验证元数据中包含从URL提取的域名
      const putObjectCall = mockMinioClient.putObject.mock.calls[0];
      const metadata = putObjectCall[4];
      expect(metadata).toHaveProperty('X-Amz-Meta-Domain');
    });

    it('应该在没有媒体文件时返回null', async () => {
      const emptySessionId = 'empty-session';
      const metadataPath = await service.saveMediaMetadata(emptySessionId);
      
      expect(metadataPath).toBeNull();
      expect(mockStorageService.getClient).not.toHaveBeenCalled();
    });

    it('应该处理MinIO保存错误', async () => {
      // 为这个测试用例配置mock
      mockStorageService.getClient.mockResolvedValueOnce(mockMinioClient);
      mockStorageService.getBucketName.mockReturnValueOnce('test-bucket');
      mockMinioClient.putObject.mockRejectedValueOnce(new Error('MinIO save error'));
      
      const metadataPath = await service.saveMediaMetadata(sessionId, 'example.com');
      
      expect(metadataPath).toBeNull();
    });

    it('应该处理无效的源URL', async () => {
      const invalidUrlFile: MediaFileInfo = {
        ...mockMediaFile,
        sourceUrl: 'invalid-url'
      };
      
      // 清理会话数据
      service.cleanupSession('invalid-url-session');
      
      // 为这个测试用例配置mock
      mockStorageService.getClient.mockResolvedValueOnce(mockMinioClient);
      mockStorageService.getBucketName.mockReturnValueOnce('test-bucket');
      mockMinioClient.putObject.mockResolvedValueOnce({});
      
      // 先保存媒体文件到会话中
      service.saveMediaFilesToSession('invalid-url-session', [invalidUrlFile]);
      
      // 验证媒体文件已保存
      const savedFiles = service.getSessionMediaFiles('invalid-url-session');
      expect(savedFiles).toHaveLength(1);
      
      const metadataPath = await service.saveMediaMetadata('invalid-url-session');
      
      expect(metadataPath).toBeDefined(); // 应该使用默认域名
      expect(mockMinioClient.putObject).toHaveBeenCalled();
    });
  });

  describe('会话清理测试', () => {
    it('应该能够清理会话数据', () => {
      const sessionId = 'test-session-cleanup';
      
      // 先保存一些数据
      service.saveMediaFilesToSession(sessionId, mockMediaFiles);
      expect(service.getSessionMediaFiles(sessionId)).toHaveLength(3);
      
      // 清理会话
      service.cleanupSession(sessionId);
      
      // 验证数据已被清理
      expect(service.getSessionMediaFiles(sessionId)).toEqual([]);
    });

    it('应该能够清理不存在的会话', () => {
      expect(() => service.cleanupSession('non-existent-session')).not.toThrow();
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空的媒体文件数组', () => {
      const sessionId = 'empty-files-session';
      
      service.saveMediaFilesToSession(sessionId, []);
      
      const files = service.getSessionMediaFiles(sessionId);
      expect(files).toEqual([]);
    });

    it('应该处理包含null/undefined字段的媒体文件', () => {
      const incompleteFile: MediaFileInfo = {
        url: 'https://example.com/incomplete.jpg',
        type: 'image',
        extension: 'jpg',
        fileName: 'incomplete.jpg',
        sourceUrl: 'https://example.com/page.html',
        size: undefined,
        storagePath: undefined,
        md5Hash: undefined,
        downloadedAt: undefined,
        metadata: undefined
      };
      
      const sessionId = 'incomplete-file-session';
      
      expect(() => {
        service.saveMediaFilesToSession(sessionId, [incompleteFile]);
      }).not.toThrow();
      
      const files = service.getSessionMediaFiles(sessionId);
      expect(files).toHaveLength(1);
      expect(files[0].fileName).toBe('incomplete.jpg');
    });

    it('应该处理特殊字符的文件名和元数据', () => {
      const specialFile: MediaFileInfo = {
        ...mockMediaFile,
        fileName: '特殊字符文件名 & < > " \' 测试.jpg',
        metadata: {
          alt: '特殊字符 & < > " \' 测试',
          title: 'Title with 🎉 emoji',
          description: 'Description with\nnewlines\tand\ttabs'
        }
      };
      
      const sessionId = 'special-chars-session';
      
      expect(() => {
        service.saveMediaFilesToSession(sessionId, [specialFile]);
      }).not.toThrow();
      
      const files = service.getSessionMediaFiles(sessionId);
      expect(files).toHaveLength(1);
      expect(files[0].fileName).toBe('特殊字符文件名 & < > " \' 测试.jpg');
    });

    it('应该处理大量媒体文件', () => {
      const largeFileList: MediaFileInfo[] = Array.from({ length: 1000 }, (_, i) => ({
        ...mockMediaFile,
        url: `https://example.com/image${i}.jpg`,
        fileName: `image${i}.jpg`
      }));
      
      const sessionId = 'large-files-session';
      
      expect(() => {
        service.saveMediaFilesToSession(sessionId, largeFileList);
      }).not.toThrow();
      
      const files = service.getSessionMediaFiles(sessionId);
      expect(files).toHaveLength(1000);
      
      const stats = service.getAllMediaFilesStats();
      expect(stats.totalFiles).toBe(1000);
    });
  });
});