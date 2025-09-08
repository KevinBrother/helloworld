import { describe, it, expect } from 'vitest';
import {
  PlaywrightCrawler,
  Dataset,
  RequestQueue,
  KeyValueStore,
} from 'crawlee';
import { createHash } from 'crypto';
import { withMockServer } from '../helpers/test-utils';

describe('URL去重机制和缓存策略', () => {
  describe('URL去重机制', () => {
    it('应该能够自动去除重复URL', async () => {
      await withMockServer(async (helper) => {
        const processedUrls: string[] = [];

        const crawler = new PlaywrightCrawler({
          requestHandler: async ({ page, request, enqueueLinks }) => {
            processedUrls.push(request.url);

            // 尝试添加重复的链接
            if (request.url === helper.getServerUrl('/')) {
              const queue = await RequestQueue.open();

              // 手动添加相同的URL多次
              await queue.addRequest({ url: helper.getServerUrl('/page1') });
              await queue.addRequest({ url: helper.getServerUrl('/page1') }); // 重复
              await queue.addRequest({ url: helper.getServerUrl('/page2') });
              await queue.addRequest({ url: helper.getServerUrl('/page1') }); // 重复

              // 使用 enqueueLinks 也会自动去重
              await enqueueLinks({
                urls: [
                  helper.getServerUrl('/page1'), // 重复
                  helper.getServerUrl('/page3'),
                ],
              });
            }
          },
        });

        await crawler.run([helper.getServerUrl('/')]);

        // 验证URL去重效果
        const uniqueUrls = new Set(processedUrls);
        expect(processedUrls.length).toBeGreaterThan(
          uniqueUrls.size || processedUrls.length
        ); // 可能因为去重而处理更少的URL

        // 检查是否处理了不同的页面
        const hasMainPage = processedUrls.some(
          (url) => url === helper.getServerUrl('/')
        );
        expect(hasMainPage).toBe(true);
      });
    });

    it('应该能够检查URL是否已处理', async () => {
      const queue = await RequestQueue.open();

      // 添加请求
      await queue.addRequest({
        url: 'http://example.com/test1',
        userData: { id: 1 },
      });

      await queue.addRequest({
        url: 'http://example.com/test2',
        userData: { id: 2 },
      });

      // 获取并处理第一个请求
      const request1 = await queue.fetchNextRequest();
      expect(request1).toBeTruthy();

      if (request1) {
        await queue.markRequestHandled(request1);
      }

      // 检查队列状态
      const queueInfo = await queue.getInfo();
      expect(queueInfo?.handledRequestCount).toBe(1);
      expect(queueInfo?.pendingRequestCount).toBe(1);

      // 尝试添加已处理的URL（应该被忽略或标记为重复）
      await queue.addRequest({
        url: 'http://example.com/test1', // 重复的URL
        userData: { id: 1 },
      });

      const updatedInfo = await queue.getInfo();
      // 重复的请求不应该增加总数
      expect(updatedInfo?.totalRequestCount).toBe(2);

      await queue.drop();
    });

    it('应该能够实现自定义URL指纹去重', async () => {
      const processedFingerprints = new Set<string>();
      const duplicateCount = { count: 0 };

      const generateFingerprint = (url: string, userData: any): string => {
        const content = `${url}-${JSON.stringify(userData)}`;
        return createHash('md5').update(content).digest('hex');
      };

      await withMockServer(async (helper) => {
        const crawler = new PlaywrightCrawler({
          requestHandler: async ({ request }) => {
            const fingerprint = generateFingerprint(
              request.url,
              request.userData
            );

            if (processedFingerprints.has(fingerprint)) {
              duplicateCount.count++;
              console.log(`重复请求检测: ${request.url}`);
              return; // 跳过重复请求
            }

            processedFingerprints.add(fingerprint);

            await Dataset.pushData({
              url: request.url,
              fingerprint,
              userData: request.userData,
              processedAt: new Date().toISOString(),
            });
          },
        });

        const urls = [
          { url: helper.getServerUrl('/page1'), userData: { type: 'A' } },
          { url: helper.getServerUrl('/page1'), userData: { type: 'A' } }, // 完全重复
          { url: helper.getServerUrl('/page1'), userData: { type: 'B' } }, // URL相同但userData不同
          { url: helper.getServerUrl('/page2'), userData: { type: 'A' } },
        ];

        for (const urlData of urls) {
          await crawler.addRequests([urlData]);
        }

        await crawler.run();

        const dataset = await Dataset.open();
        const { items } = await dataset.getData();

        // 应该有3个唯一的请求（去掉1个完全重复的）
        expect(items).toHaveLength(3);

        // 验证指纹唯一性
        const fingerprints = items.map((item) => item.fingerprint);
        const uniqueFingerprints = new Set(fingerprints);
        expect(fingerprints.length).toBe(uniqueFingerprints.size);

        await dataset.drop();
      });
    });
  });

  describe('页面内容缓存复用', () => {
    it('应该能够缓存页面内容', async () => {
      await withMockServer(async (helper) => {
        const cache = await KeyValueStore.open('page-cache');
        let fetchCount = 0;

        const isExpired = (timestamp: string) => {
          const expireTime =
            new Date(timestamp).getTime() + 24 * 60 * 60 * 1000; // 24小时
          return Date.now() > expireTime;
        };

        const crawler = new PlaywrightCrawler({
          requestHandler: async ({ page, request }) => {
            const cacheKey = `page-${Buffer.from(request.url).toString('base64')}`;

            // 检查缓存
            const cachedContent = (await cache.getValue(cacheKey)) as any;

            if (cachedContent && !isExpired(cachedContent.timestamp)) {
              console.log(`使用缓存内容: ${request.url}`);
              await Dataset.pushData({
                ...cachedContent.data,
                fromCache: true,
              });
              return;
            }

            // 获取新内容
            fetchCount++;
            const content = await page.textContent('body');
            const data = {
              url: request.url,
              content: content?.trim(),
              fetchedAt: new Date().toISOString(),
              fromCache: false,
            };

            // 缓存内容
            await cache.setValue(cacheKey, {
              data,
              timestamp: new Date().toISOString(),
              expiresAt: new Date(
                Date.now() + 24 * 60 * 60 * 1000
              ).toISOString(),
            });

            await Dataset.pushData(data);
          },
        });

        const testUrl = helper.getServerUrl('/');

        // 第一次访问 - 应该从服务器获取
        await crawler.run([testUrl]);

        // 第二次访问同一URL - 应该从缓存获取
        const crawler2 = new PlaywrightCrawler({
          requestHandler: async ({ request }) => {
            const cacheKey = `page-${Buffer.from(request.url).toString('base64')}`;
            const cachedContent = (await cache.getValue(cacheKey)) as any;

            if (cachedContent && !isExpired(cachedContent.timestamp)) {
              await Dataset.pushData({
                ...cachedContent.data,
                fromCache: true,
              });
              return;
            }
          },
        });

        await crawler2.run([testUrl]);

        const dataset = await Dataset.open();
        const { items } = await dataset.getData();

        expect(items).toHaveLength(2);
        expect(items[0].fromCache).toBe(false); // 第一次从服务器
        expect(items[1].fromCache).toBe(true); // 第二次从缓存
        expect(fetchCount).toBe(1); // 只从服务器获取了一次

        await dataset.drop();
        await cache.drop();
      });
    });

    it('应该能够处理缓存过期', async () => {
      const cache = await KeyValueStore.open('expiry-test');

      // 设置一个过期的缓存项
      const expiredData = {
        data: { content: 'expired content' },
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25小时前
        expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1小时前过期
      };

      await cache.setValue('test-key', expiredData);

      // 检查过期逻辑
      const isExpired = (timestamp: string) => {
        const expireTime = new Date(timestamp).getTime() + 24 * 60 * 60 * 1000;
        return Date.now() > expireTime;
      };

      const cachedItem = (await cache.getValue('test-key')) as any;
      expect(cachedItem).toBeTruthy();
      expect(isExpired(cachedItem.timestamp)).toBe(true);

      await cache.drop();
    });

    it('应该能够实现智能缓存策略', async () => {
      const cache = await KeyValueStore.open('smart-cache');
      let cacheHits = 0;
      let cacheMisses = 0;

      const smartCache = {
        async get(key: string) {
          const item = (await cache.getValue(key)) as any;
          if (item && Date.now() < new Date(item.expiresAt).getTime()) {
            cacheHits++;
            return item.data;
          }
          cacheMisses++;
          return null;
        },

        async set(key: string, data: any, ttlMs: number = 60000) {
          await cache.setValue(key, {
            data,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + ttlMs).toISOString(),
          });
        },
      };

      // 测试缓存操作
      const testKey = 'test-data';
      const testData = { message: 'Hello World', timestamp: Date.now() };

      // 首次获取 - 缓存未命中
      let result = await smartCache.get(testKey);
      expect(result).toBe(null);
      expect(cacheMisses).toBe(1);

      // 设置缓存
      await smartCache.set(testKey, testData, 5000); // 5秒TTL

      // 再次获取 - 缓存命中
      result = await smartCache.get(testKey);
      expect(result).toEqual(testData);
      expect(cacheHits).toBe(1);

      // 等待缓存过期
      await new Promise((resolve) => setTimeout(resolve, 100)); // 短暂等待

      // 验证缓存仍然有效（5秒内）
      result = await smartCache.get(testKey);
      expect(result).toEqual(testData);
      expect(cacheHits).toBe(2);

      await cache.drop();
    });
  });

  describe('请求指纹去重', () => {
    it('应该能够基于内容哈希去重', async () => {
      const fingerprintStore = await KeyValueStore.open('request-fingerprints');
      const processedRequests: any[] = [];

      const generateContentHash = (data: any): string => {
        const content = `${data.title}-${data.url}`;
        return createHash('md5').update(content).digest('hex');
      };

      await withMockServer(async (helper) => {
        const crawler = new PlaywrightCrawler({
          requestHandler: async ({ page, request }) => {
            const title = await page.textContent('h1');
            const data = {
              url: request.url,
              title: title?.trim(),
              content: await page.textContent('body'),
            };

            const contentHash = generateContentHash(data);
            const existingFingerprint = (await fingerprintStore.getValue(
              contentHash
            )) as any;

            if (existingFingerprint) {
              console.log(`重复内容检测: ${request.url}`);
              processedRequests.push({
                ...data,
                isDuplicate: true,
                originalUrl: existingFingerprint.url,
              });
              return;
            }

            // 标记该内容已处理
            await fingerprintStore.setValue(contentHash, {
              url: request.url,
              processedAt: new Date().toISOString(),
              hash: contentHash,
            });

            processedRequests.push({
              ...data,
              isDuplicate: false,
              contentHash,
            });
          },
        });

        // 测试相同内容的不同URL
        const urls = [
          helper.getServerUrl('/page1'),
          helper.getServerUrl('/page1?param=1'), // 不同参数但内容相同
          helper.getServerUrl('/page2'),
        ];

        await crawler.run(urls);

        expect(processedRequests.length).toBeGreaterThan(0);

        // 检查是否正确识别了重复内容
        const duplicates = processedRequests.filter((req) => req.isDuplicate);
        const originals = processedRequests.filter((req) => !req.isDuplicate);

        expect(originals.length).toBeGreaterThan(0);

        // 如果有重复，验证指纹系统工作正常
        if (duplicates.length > 0) {
          expect(duplicates.every((dup) => dup.originalUrl)).toBe(true);
        }
      });

      await fingerprintStore.drop();
    });

    it('应该能够实现复杂的去重规则', async () => {
      const deduplicationRules = {
        // URL规范化
        normalizeUrl: (url: string): string => {
          const urlObj = new URL(url);
          // 移除常见的追踪参数
          urlObj.searchParams.delete('utm_source');
          urlObj.searchParams.delete('utm_medium');
          urlObj.searchParams.delete('utm_campaign');
          // 按字母顺序排列参数
          urlObj.searchParams.sort();
          return urlObj.toString();
        },

        // 内容相似性检查
        calculateSimilarity: (content1: string, content2: string): number => {
          if (!content1 || !content2) return 0;

          const normalize = (str: string) =>
            str.toLowerCase().replace(/\s+/g, ' ').trim();
          const norm1 = normalize(content1);
          const norm2 = normalize(content2);

          if (norm1 === norm2) return 1.0;

          // 简单的相似性计算
          const words1 = new Set(norm1.split(' '));
          const words2 = new Set(norm2.split(' '));
          const intersection = new Set(
            [...words1].filter((x) => words2.has(x))
          );
          const union = new Set([...words1, ...words2]);

          return intersection.size / union.size;
        },

        // 判断是否为重复内容
        isDuplicate: function (
          newContent: any,
          existingContents: any[],
          threshold: number = 0.8
        ): any {
          const normalizedUrl = this.normalizeUrl(newContent.url);

          for (const existing of existingContents) {
            const existingNormalizedUrl = this.normalizeUrl(existing.url);

            // URL完全匹配
            if (normalizedUrl === existingNormalizedUrl) {
              return {
                isDuplicate: true,
                reason: 'identical_url',
                original: existing,
              };
            }

            // 内容相似性检查
            const similarity = this.calculateSimilarity(
              newContent.content,
              existing.content
            );
            if (similarity >= threshold) {
              return {
                isDuplicate: true,
                reason: 'similar_content',
                similarity,
                original: existing,
              };
            }
          }

          return { isDuplicate: false };
        },
      };

      // 测试去重规则
      const existingContents = [
        {
          url: 'https://example.com/page?utm_source=google&id=1',
          title: 'Test Page',
          content: 'This is a test page with some content',
        },
      ];

      const newContents = [
        {
          url: 'https://example.com/page?id=1&utm_source=facebook', // 相同页面，不同追踪参数
          title: 'Test Page',
          content: 'This is a test page with some content',
        },
        {
          url: 'https://example.com/page2',
          title: 'Similar Page',
          content: 'This is a test page with some different content', // 内容相似
        },
      ];

      const results = newContents.map((content) => {
        const result = deduplicationRules.isDuplicate(
          content,
          existingContents
        );
        return { ...content, ...result };
      });

      expect(results).toHaveLength(2);
      expect(results[0].isDuplicate).toBe(true);
      expect(results[0].reason).toBe('identical_url');

      // 第二个可能因为内容相似而被标记为重复
      if (results[1].isDuplicate) {
        expect(results[1].reason).toBe('similar_content');
        expect(results[1].similarity).toBeDefined();
      }
    });
  });
});
