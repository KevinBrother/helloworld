import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import {
  PlaywrightCrawler,
  Dataset,
  KeyValueStore,
  Configuration,
} from 'crawlee';
import { RedisRequestQueue } from '../redis-request-queue';

describe('RedisRequestQueue', () => {
  let queue: RedisRequestQueue;

  afterEach(async () => {
    if (queue) {
      await queue.drop(); // 清理数据
      await queue.disconnect(); // 断开连接
    }
  });

  it('自定义的redisQueue基础功能应该实现成功', async () => {
    queue = new RedisRequestQueue({
      redisUrl: 'redis://localhost:6379',
      queueName: 'test-queue',
    });
    const request = await queue.addRequest({ url: 'http://example.com' });
    expect(request.wasAlreadyPresent).toBe(false);

    const fetchedRequest = await queue.fetchNextRequest();
    expect(fetchedRequest?.url).toBe('http://example.com');
  });

  it('自定义的redisQueue基础功能应该被crawlee正确使用', async () => {
    queue = new RedisRequestQueue({
      redisUrl: 'redis://localhost:6379',
      queueName: 'test-crawler-queue',
    });
    
    const crawler = new PlaywrightCrawler({
      requestQueue: queue,
      maxConcurrency: 1,
      requestHandler: async ({ page, request, pushData }) => {
        const title = await page.title();
        console.log(`Title of ${request.url}: ${title}`);
        
        // 保存数据到 dataset
        await pushData({
          url: request.url,
          title: title,
        });
      },
    });

    await queue.addRequest({ url: 'http://example.com' });
    await crawler.run();

    const dataset = await Dataset.open();
    const data = await dataset.getData();
    expect(data.items.length).toBe(1);
    expect(data.items[0].url).toBe('http://example.com');
    expect(data.items[0].title).toBe('Example Domain');

  });
});
