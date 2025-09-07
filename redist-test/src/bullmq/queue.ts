import { Job } from "bullmq";
import { getCrawlQueue } from "../config/bullmq";
import { CrawlJobData } from "./job";

const crawlQueue = getCrawlQueue<CrawlJobData>();

crawlQueue.on("waiting", (job: Job<CrawlJobData>) => {
  console.log(`任务 ${job.id} 已入队，等待处理`);
});

await crawlQueue.add("crawl", {
  url: "https://www.baidu.com",
}, {
  // jobId: "uuid_123121",
});
