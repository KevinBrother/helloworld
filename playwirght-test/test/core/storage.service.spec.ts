import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from '../../src/core/storage/storage.service';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';
import { Client as MinioClient } from 'minio';
import { createPageData } from '../fixtures/test-data-factory';

// Mock Minio
vi.mock('minio', () => ({
  Client: vi.fn().mockImplementation(() => ({
    bucketExists: vi.fn(),
    makeBucket: vi.fn(),
    putObject: vi.fn(),
    getObject: vi.fn(),
    removeObject: vi.fn(),
    listObjects: vi.fn(),
    statObject: vi.fn(),
  })),
}));

const mockMinioClient = {
  bucketExists: vi.fn(),
  makeBucket: vi.fn(),
  putObject: vi.fn(),
  getObject: vi.fn(),
  removeObject: vi.fn(),
  listObjects: vi.fn(),
  statObject: vi.fn(),
};

describe('StorageService', () => {
  let service: StorageService;
  let module: TestingModule;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup mock implementations
    (MinioClient as any).mockImplementation(() => mockMinioClient);
    mockMinioClient.bucketExists.mockResolvedValue(true);
    mockMinioClient.makeBucket.mockResolvedValue(undefined);
    mockMinioClient.putObject.mockResolvedValue({ etag: 'test-etag' });
    mockMinioClient.getObject.mockResolvedValue(Buffer.from('test data'));
    mockMinioClient.removeObject.mockResolvedValue(undefined);
    mockMinioClient.statObject.mockResolvedValue({ size: 1024, etag: 'test-etag' });

    module = await Test.createTestingModule({
      providers: [StorageService],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('basic functionality', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should return correct bucket name', () => {
      const bucketName = service.getBucketName();
      expect(bucketName).toBe('crawler-pages');
    });
  });

  describe('savePageData', () => {
    it('should save page data successfully', async () => {
      const pageData = createPageData();
      const sessionId = 'test-session';
      
      const result = await service.savePageData(pageData, sessionId);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(mockMinioClient.putObject).toHaveBeenCalled();
    });

    it('should handle save failures', async () => {
      const pageData = createPageData();
      const sessionId = 'test-session';
      mockMinioClient.putObject.mockRejectedValue(new Error('Save failed'));
      
      await expect(service.savePageData(pageData, sessionId)).rejects.toThrow('Save failed');
    });
  });

  describe('saveScreenshot', () => {
    it('should save screenshot successfully', async () => {
      const screenshot = Buffer.from('screenshot data');
      const url = 'https://example.com';
      const sessionId = 'test-session';
      
      const result = await service.saveScreenshot(screenshot, url, sessionId);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(mockMinioClient.putObject).toHaveBeenCalled();
    });
  });

  describe('saveSessionMetadata', () => {
    it('should save session metadata successfully', async () => {
      const sessionId = 'test-session';
      const metadata = { test: 'data' };
      
      const result = await service.saveSessionMetadata(sessionId, metadata);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(mockMinioClient.putObject).toHaveBeenCalled();
    });
  });

  describe('getClient', () => {
    it('should return MinIO client', async () => {
      const client = await service.getClient();
      expect(client).toBeDefined();
    });
  });

  describe('initialization', () => {
    it('should create bucket if not exists', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);
      const pageData = createPageData();
      
      await service.savePageData(pageData, 'test-session');
      
      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('crawler-pages');
      expect(mockMinioClient.makeBucket).toHaveBeenCalledWith('crawler-pages', 'us-east-1');
    });

    it('should not create bucket if exists', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      const pageData = createPageData();
      
      await service.savePageData(pageData, 'test-session');
      
      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('crawler-pages');
      expect(mockMinioClient.makeBucket).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle storage errors gracefully', async () => {
      const pageData = createPageData();
      mockMinioClient.putObject.mockRejectedValue(new Error('Storage error'));
      
      await expect(service.savePageData(pageData, 'test-session')).rejects.toThrow('Storage error');
    });
  });
});