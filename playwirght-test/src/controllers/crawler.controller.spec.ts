import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { CrawlerController } from './crawler.controller';
import { WebsiteCrawlerService } from '../services/crawler/website-crawler.service';
import { StorageService } from '../core/storage/storage.service';
import { MediaStorageService } from '../services/media/media-storage.service';
import { CrawlRequest, CrawlResponse, CrawlSession, MediaFileInfo } from '../shared/interfaces/crawler.interface';

// Mock classes for services
class MockWebsiteCrawlerService {
    crawlWebsite = vi.fn();
    getSessionStatus = vi.fn();
    getActiveSessions = vi.fn();
    stopCrawling = vi.fn();
}

class MockStorageService {
    getClient = vi.fn();
    getBucketName = vi.fn();
}

class MockMediaStorageService {
    getSessionMediaFiles = vi.fn();
    getMediaFilesByType = vi.fn();
    getMediaFilesByExtension = vi.fn();
    getAllMediaFilesStats = vi.fn();
    searchMediaFiles = vi.fn();
    getMediaFile = vi.fn();
}


describe('CrawlerController', () => {
  let controller: CrawlerController;
  let crawlerService: MockWebsiteCrawlerService;
  let mediaStorageService: MockMediaStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrawlerController],
      providers: [
        { provide: WebsiteCrawlerService, useClass: MockWebsiteCrawlerService },
        { provide: StorageService, useClass: MockStorageService },
        { provide: MediaStorageService, useClass: MockMediaStorageService },
      ],
    }).compile();

    controller = module.get<CrawlerController>(CrawlerController);
    crawlerService = module.get<WebsiteCrawlerService, MockWebsiteCrawlerService>(WebsiteCrawlerService);
    mediaStorageService = module.get<MediaStorageService, MockMediaStorageService>(MediaStorageService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('crawlWebsite', () => {
    it('should start a crawl job successfully', async () => {
      const request: CrawlRequest = { startUrl: 'https://example.com' };
      const response: CrawlResponse = { sessionId: '123', status: 'started', message: 'OK' };
      crawlerService.crawlWebsite.mockResolvedValue(response);

      await expect(controller.crawlWebsite(request)).resolves.toEqual(response);
      expect(crawlerService.crawlWebsite).toHaveBeenCalledWith(request);
    });

    it('should throw BadRequestException for invalid URL', async () => {
      const request: CrawlRequest = { startUrl: 'invalid-url' };
      await expect(controller.crawlWebsite(request)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSessionStatus', () => {
    it('should return session status', async () => {
        const sessionId = 'test-session';
        const mockSession: CrawlSession = {
            sessionId,
            startUrl: 'https://example.com',
            status: 'running',
            startTime: new Date(),
            pagesProcessed: 0,
            totalPages: 1,
            errors: [],
            maxDepth: 2,
            maxPages: 10,
            isCompleteCrawl: false,
            takeScreenshots: false,
            allowedDomains: [],
            excludePatterns: [],
        };
        crawlerService.getSessionStatus.mockReturnValue(mockSession);

        const result = await controller.getSessionStatus(sessionId);
        expect(result).toEqual(mockSession);
        expect(crawlerService.getSessionStatus).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('getSessionMediaFiles', () => {
    it('should return media files for a session', async () => {
        const sessionId = 'test-session';
        const mockMediaFiles: MediaFileInfo[] = [{
            fileName: 'test.jpg',
            url: 'https://example.com/test.jpg',
            sourceUrl: 'https://example.com',
            type: 'image',
            extension: 'jpg',
            size: 1024,
            downloadedAt: new Date().toISOString(),
            storagePath: 'path/to/test.jpg',
        }];
        mediaStorageService.getSessionMediaFiles.mockResolvedValue(mockMediaFiles);

        const result = await controller.getSessionMediaFiles(sessionId);
        expect(result.files).toEqual(mockMediaFiles);
        expect(result.total).toBe(1);
        expect(mediaStorageService.getSessionMediaFiles).toHaveBeenCalledWith(sessionId);
    });
  });
});