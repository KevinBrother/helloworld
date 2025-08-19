import { describe, it, expect, beforeEach, vi, Mocked } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { CrawlerController } from "./crawler.controller";
import { WebsiteCrawlerService } from "../services/crawler/website-crawler.service";
import {
  CrawlRequest,
  CrawlResponse,
  CrawSession,
} from "../shared/interfaces/crawler.interface";

describe("CrawlerController", () => {
  let controller: CrawlerController;
  let crawlerService: any;

  beforeEach(async () => {
    // 创建简单的 mock 对象
    crawlerService = {
      crawlWebsite: vi.fn(),
      crawlWebsite1: vi.fn(),
      getSessionStatus: vi.fn(),
      getActiveSessions: vi.fn(),
      stopCrawling: vi.fn(),
    } as unknown as Mocked<WebsiteCrawlerService>;

    // 直接创建控制器实例，手动注入依赖
    controller = new CrawlerController(
      crawlerService,
    );

    // 验证依赖注入是否正确
    expect(controller).toBeDefined();
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
      const mockSession: CrawSession = {
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

});
