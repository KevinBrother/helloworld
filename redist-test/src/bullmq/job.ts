export interface CrawlJobData {
  url: string;
}

export interface CrawlWorkerData {
  status2: string;
  url2: string;
}

export const crawlQueueName = "{crawlQueue}";