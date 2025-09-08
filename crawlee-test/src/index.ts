import express, { Request, Response } from 'express';
import {
  PlaywrightCrawler,
  RequestQueue,
  Dataset,
  KeyValueStore,
} from 'crawlee';
import { v4 as uuidv4 } from 'uuid';

interface TaskMetadata {
  totalUrls: number;
  createdAt?: Date;
  requestIds: string[]; // 存储该任务的所有请求ID
}

interface TaskStatus {
  totalUrls: number;
  completedCount: number;
  failedCount: number;
  pendingCount: number;
}

const app = express();
app.use(express.json());

// Global variables
let queue: RequestQueue;
let crawler: PlaywrightCrawler;
// 跟踪任务状态的内存存储（生产环境可替换为数据库）
const taskStatusMap = new Map<string, TaskStatus>();

// 初始化函数
async function initializeCrawler() {
  // 初始化全局队列
  queue = await RequestQueue.open('global-queue');

  // 初始化爬虫
  crawler = new PlaywrightCrawler({
    requestQueue: queue,
    maxConcurrency: 10,
    browserPoolOptions: { maxOpenPagesPerBrowser: 5 },
    autoscaledPoolOptions: {
      isFinishedFunction: async () => false, // 永远不自动结束
    },
    async requestHandler({ request, page, log, enqueueLinks }) {
      const { userId, taskId, requestId } = request.userData;
      log.info(`Processing ${request.url} for user ${userId}, task ${taskId}`);
      const dataset = await Dataset.open(`user-${userId}-task-${taskId}`);
      await dataset.pushData({
        url: request.url,
        title: await page.title(),
        completedAt: new Date(),
      });

      // 更新任务状态 - 增加完成计数
      updateTaskStatus(taskId, 'completed');

      // 自动入队链接
      await enqueueLinks({
        // 给新添加的请求附加用户数据（必须！否则新请求没有 userId/taskId，后续无法跟踪状态）
        userData: {
          userId,
          taskId,
          requestId,
        },
      });
    },
    failedRequestHandler: async ({ request, error, log }) => {
      const { userId, taskId, requestId } = request.userData;
      log.error(`Failed ${request.url}: ${error}`);

      const failedDataset = await Dataset.open(
        `user-${userId}-task-${taskId}-failed`
      );
      await failedDataset.pushData({
        url: request.url,
        error: error,
        failedAt: new Date(),
      });

      // 更新任务状态 - 增加失败计数
      updateTaskStatus(taskId, 'failed');
    },
  });

  // 启动爬虫（持续运行）
  crawler.run().catch((error) => {
    console.error('Crawler error:', error);
  });
}

// 更新任务状态
function updateTaskStatus(taskId: string, type: 'completed' | 'failed') {
  const status = taskStatusMap.get(taskId);
  if (status) {
    if (type === 'completed') {
      status.completedCount++;
    } else {
      status.failedCount++;
    }
    status.pendingCount =
      status.totalUrls - status.completedCount - status.failedCount;
    taskStatusMap.set(taskId, status);
  }
}

// 存储任务元数据
async function saveTaskMetadata(
  userId: string,
  taskId: string,
  totalUrls: number,
  requestIds: string[]
) {
  const kvStore = await KeyValueStore.open(`user-${userId}`);
  await kvStore.setValue(`task-${taskId}`, {
    totalUrls,
    createdAt: new Date(),
    requestIds,
  });

  // 初始化任务状态
  taskStatusMap.set(taskId, {
    totalUrls,
    completedCount: 0,
    failedCount: 0,
    pendingCount: totalUrls,
  });
}

// 获取任务元数据
async function getTaskMetadata(
  userId: string,
  taskId: string
): Promise<TaskMetadata> {
  const kvStore = await KeyValueStore.open(`user-${userId}`);
  return (
    (await kvStore.getValue(`task-${taskId}`)) || {
      totalUrls: 0,
      requestIds: [],
    }
  );
}

// 获取特定任务的队列状态
async function getTaskQueueStatus(taskId: string): Promise<TaskStatus> {
  return (
    taskStatusMap.get(taskId) || {
      totalUrls: 0,
      completedCount: 0,
      failedCount: 0,
      pendingCount: 0,
    }
  );
}

// API 接受任务
app.post('/crawl', async (req: Request, res: Response) => {
  const { urls, userId, taskId } = req.body;
  if (!urls || !userId || !taskId) {
    return res.status(400).json({ error: 'Missing urls, userId, or taskId' });
  }

  // 为每个URL生成唯一ID并添加到队列
  const requestIds: string[] = [];
  for (const url of urls) {
    const requestId = uuidv4(); // 生成唯一请求ID
    requestIds.push(requestId);

    await queue.addRequest({
      url,
      userData: {
        userId,
        taskId,
        requestId, // 将请求ID添加到用户数据
      },
    });

    console.log(
      `Request added: URL=${url}, Task=${taskId}, RequestId=${requestId}`
    );
  }

  // 保存任务元数据，包括所有请求ID
  await saveTaskMetadata(userId, taskId, urls.length, requestIds);

  res.json({ status: 'Task added', taskId });
});

// 查询任务状态和进度
app.get('/task/:taskId/status', async (req: Request, res: Response) => {
  const { userId } = req.query as { userId?: string };
  const { taskId } = req.params;

  if (!userId || !taskId) {
    return res.status(400).json({ error: 'Missing userId or taskId' });
  }

  // 获取任务元数据
  const metadata = await getTaskMetadata(userId, taskId);
  const totalUrls = metadata.totalUrls || 0;

  // 获取数据集（已完成请求）
  const dataset = await Dataset.open(`user-${userId}-task-${taskId}`);
  const data = await dataset.getData();
  const completedCount = data.items.length;

  // 获取失败的请求
  const failedDataset = await Dataset.open(
    `user-${userId}-task-${taskId}-failed`
  );
  const failedData = await failedDataset.getData();
  const failedCount = failedData.items.length;

  // 获取任务状态
  const taskStatus = await getTaskQueueStatus(taskId);

  // 判断任务是否完成
  const isCompleted = taskStatus.pendingCount === 0;

  // 计算进度
  const progress =
    totalUrls > 0
      ? ((taskStatus.completedCount + taskStatus.failedCount) / totalUrls) * 100
      : 0;

  res.json({
    taskId,
    userId,
    totalUrls,
    completedCount: taskStatus.completedCount,
    failedCount: taskStatus.failedCount,
    pendingCount: taskStatus.pendingCount,
    progress: `${progress.toFixed(2)}%`,
    isCompleted,
    items: data.items, // 已爬取的数据
    failedItems: failedData.items, // 失败的请求
  });
});

// 启动服务器和初始化爬虫
async function startServer() {
  await initializeCrawler();

  //   // 临时：每5秒打印一次队列长度，验证请求是否在队列中
  // setInterval(async () => {
  //   const queueLength = await queue.getInfo().then(info => info?.pendingRequestCount);
  //   console.log(`Current queue pending requests: ${queueLength}`);
  // }, 5000);

  app.listen(3000, () =>
    console.log('SaaS API running, http://localhost:3000')
  );
}

startServer().catch(console.error);
