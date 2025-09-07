import { Job, JobProgress, Worker } from "bullmq";
import { getRedisClient } from "../config/redis";
import { CrawlJobData, crawlQueueName, CrawlWorkerData } from "./job";

// 创建Worker时添加调试日志 
console.log('正在初始化爬虫Worker...');
console.log(`使用队列名称: ${crawlQueueName}`);

const worker = new Worker<CrawlJobData, CrawlWorkerData>(
  crawlQueueName, 
  async (job: Job<CrawlJobData>) => {
    console.log(`开始处理任务 ${job.id}，URL: ${job.data.url}`);
    
    // 添加一些模拟处理逻辑，方便测试
    for (let i = 0; i <= 100; i += 10) {
      await job.updateProgress(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`任务 ${job.id} 处理完成`);
    return { status2: 'ok_completed', url2: job.data.url };
  }, 
  {
    connection: getRedisClient(),
  }
);

// 监听Worker是否已准备好
worker.on('ready', () => {
  console.log('Worker已准备好，等待处理任务...');
});

// 监听错误事件
worker.on('error', (err) => {
  console.error('Worker发生错误:', err);
});

worker.on("completed", (job: Job<CrawlJobData>) => {
  console.log(`任务 ${job.id} 已完成`);
});

worker.on("failed", (job: Job<CrawlJobData> | undefined, err: Error) => {
  console.log(`任务 ${job?.id} 已失败，错误信息: ${err.message}`);
}); 

// worker.on("progress", (job: Job<CrawlJobData, CrawlWorkerData>, progress: JobProgress) => {
//   console.log(`任务 ${job.id} 已处理 ${progress}%`);
// });

console.log('爬虫Worker初始化完成');
