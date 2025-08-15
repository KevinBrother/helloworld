import { describe, it, expect, beforeEach, vi, Mocked } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { CrawlerController } from "./crawler.controller";
import { WebsiteCrawlerService } from "../services/crawler/website-crawler.service";
import { StorageService } from "../core/storage/storage.service";
import { MediaStorageService } from "../services/media/media-storage.service";
import {
  CrawlRequest,
  CrawlResponse,
  CrawlSession,
  MediaFileInfo,
} from "../shared/interfaces/crawler.interface";

describe("CrawlerController", () => {
  let controller: CrawlerController;
  let crawlerService: any;
  let mediaStorageService: any;

  beforeEach(async () => {
    // 创建简单的 mock 对象
    crawlerService = {
      crawlWebsite: vi.fn(),
      crawlWebsite1: vi.fn(),
      getSessionStatus: vi.fn(),
      getActiveSessions: vi.fn(),
      stopCrawling: vi.fn(),
    } as unknown as Mocked<WebsiteCrawlerService>;

    const storageService = {
      getClient: vi.fn(),
      getBucketName: vi.fn(),
    } as unknown as Mocked<StorageService>;

    mediaStorageService = {
      getSessionMediaFiles: vi.fn(),
      getMediaFilesByType: vi.fn(),
      getMediaFilesByExtension: vi.fn(),
      getAllMediaFilesStats: vi.fn(),
      searchMediaFiles: vi.fn(),
      getMediaFile: vi.fn(),
    } as unknown as Mocked<MediaStorageService>;

    // 直接创建控制器实例，手动注入依赖
    controller = new CrawlerController(
      crawlerService,
      storageService,
      mediaStorageService
    );

    // 验证依赖注入是否正确
    expect(controller).toBeDefined();
    expect(crawlerService).toBeDefined();
    expect(mediaStorageService).toBeDefined();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("crawlWebsite", () => {
    it("should start a crawl job successfully", async () => {
      const request: CrawlRequest = { startUrl: "https://example.com" };
      const response: CrawlResponse = {
        sessionId: "123",
        status: "started",
        message: "OK",
      };
      crawlerService.crawlWebsite.mockResolvedValue(response);
      // console.log("controller", controller);

      await expect(controller.crawlWebsite(request)).resolves.toEqual(response);
      expect(crawlerService.crawlWebsite).toHaveBeenCalledWith(request);
    });

    it("should throw BadRequestException for invalid URL", async () => {
      const request: CrawlRequest = { startUrl: "invalid-url" };

      await expect(controller.crawlWebsite(request)).rejects.toThrow(
        BadRequestException
      );
      // crawlerService 不应该被调用，因为 URL 验证在服务调用之前就失败了
      expect(crawlerService.crawlWebsite).not.toHaveBeenCalled();
    });
  });

  describe("getSessionStatus", () => {
    it("should return session status", async () => {
      const sessionId = "test-session";
      const mockSession: CrawlSession = {
        sessionId,
        startUrl: "https://example.com",
        status: "running",
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

  describe("getSessionMediaFiles", () => {
    it("should return media files for a session", async () => {
      const sessionId = "test-session";
      const mockMediaFiles: MediaFileInfo[] = [
        {
          fileName: "test.jpg",
          url: "https://example.com/test.jpg",
          sourceUrl: "https://example.com",
          type: "image",
          extension: "jpg",
          size: 1024,
          downloadedAt: new Date().toISOString(),
          storagePath: "path/to/test.jpg",
        },
      ];

      mediaStorageService.getSessionMediaFiles.mockResolvedValue(
        mockMediaFiles
      );

      const result = await controller.getSessionMediaFiles(sessionId);
      expect(result.files).toEqual(mockMediaFiles);
      expect(result.total).toBe(1);
      expect(mediaStorageService.getSessionMediaFiles).toHaveBeenCalledWith(
        sessionId
      );
    });
  });
});
