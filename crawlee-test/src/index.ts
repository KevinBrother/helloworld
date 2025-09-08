import express, { Request, Response } from 'express';
import { PlaywrightCrawler, RequestQueue, Dataset, KeyValueStore } from 'crawlee';

interface TaskMetadata {
  totalUrls: number;
  createdAt?: Date;
}

const app = express();
app.use(express.json());

// Global variables
let queue: RequestQueue;
let crawler: PlaywrightCrawler;

// 初始化函数
async function initializeCrawler() {
  // 初始化全局队列和爬虫
  queue = await RequestQueue.open('global-queue');
  crawler = new PlaywrightCrawler({
    requestQueue: queue,
    maxConcurrency: 10,
    browserPoolOptions: { maxOpenPagesPerBrowser: 5 },
    async requestHandler({ request, page, log }) {
      const { userId, taskId } = request.userData;
      log.info(`Processing ${request.url} for user ${userId}, task ${taskId}`);
      const dataset = await Dataset.open(`user-${userId}-task-${taskId}`);
      await dataset.pushData({ url: request.url, title: await page.title() });
      await page.close();
    },
  });

  // 启动爬虫（持续运行）
  crawler.run().catch(console.error);
}

// 存储任务元数据（总 URL 数）
async function saveTaskMetadata(userId: string, taskId: string, totalUrls: number) {
  const kvStore = await KeyValueStore.open(`user-${userId}`);
  await kvStore.setValue(`task-${taskId}`, { totalUrls, createdAt: new Date() });
}

// 获取任务元数据
async function getTaskMetadata(userId: string, taskId: string): Promise<TaskMetadata> {
  const kvStore = await KeyValueStore.open(`user-${userId}`);
  return await kvStore.getValue(`task-${taskId}`) || { totalUrls: 0 };
}

// 获取特定任务的队列状态
async function getTaskQueueStatus(taskId: string) {
  // Note: RequestQueue doesn't have getRequests method, using alternative approach
  // We'll track this through other means since the queue API is limited
  return {
    pendingCount: 0, // This would need to be tracked separately
    // 注意：handledCount 需要从存储或其他方式统计
  };
}

// API 接受任务
app.post('/crawl', async (req: Request, res: Response) => {
  const { urls, userId, taskId } = req.body;
  if (!urls || !userId || !taskId) {
    return res.status(400).json({ error: 'Missing urls, userId, or taskId' });
  }

  // 添加请求到队列
  for (const url of urls) {
    await queue.addRequest({ url, userData: { userId, taskId } });
  }

  // 保存任务元数据
  await saveTaskMetadata(userId, taskId, urls.length);

  res.json({ status: 'Task added', taskId });
});

// 查询任务状态和进度
app.get('/task/:taskId/status', async (req: Request, res: Response) => {
  const { userId } = req.query;
  const { taskId } = req.params;

  if (!userId || !taskId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Missing userId or taskId' });
  }

  // 获取任务元数据
  const metadata = await getTaskMetadata(userId, taskId);
  const totalUrls = metadata.totalUrls || 0;

  // 获取数据集（已完成请求）
  const dataset = await Dataset.open(`user-${userId}-task-${taskId}`);
  const data = await dataset.getData();
  const completedCount = data.items.length;

  // 获取队列状态（待处理请求）
  const queueStatus = await getTaskQueueStatus(taskId);
  const pendingCount = queueStatus.pendingCount;

  // 判断任务是否完成
  const isCompleted = pendingCount === 0 && completedCount >= totalUrls;

  // 计算进度
  const progress = totalUrls > 0 ? (completedCount / totalUrls) * 100 : 0;

  res.json({
    taskId,
    userId,
    totalUrls,
    completedCount,
    pendingCount,
    progress: `${progress.toFixed(2)}%`,
    isCompleted,
    items: data.items, // 已爬取的数据
  });
});

// 启动服务器和初始化爬虫
async function startServer() {
  await initializeCrawler();
  app.listen(3000, () => console.log('SaaS API running'));
}

startServer().catch(console.error);