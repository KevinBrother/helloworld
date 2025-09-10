import { describe, it, expect } from 'vitest';
import { PlaywrightCrawler, Dataset, RequestQueue } from 'crawlee';
import { withMockServer } from '../helpers/test-utils';

describe('my test', () => {
  it('应该能够访问页面并获取标题', async () => {
    await withMockServer(async (helper) => {
      const results: any[] = [];

      const crawler = new PlaywrightCrawler({
        maxConcurrency: 1,
        requestHandler: async ({ page, request }) => {
          const title = await page.title();
          results.push({ url: request.url, title });
        },
      });

      await crawler.run();
    });
  });
});
