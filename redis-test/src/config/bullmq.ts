import { Queue } from "bullmq";
import { getRedisClient } from "./redis";
import { crawlQueueName } from "../bullmq/job";


let crawlQueue: Queue;

export function getCrawlQueue<T>() {
  if (!crawlQueue) {
    crawlQueue = new Queue<T>(crawlQueueName, {
      connection: getRedisClient(),
      defaultJobOptions: {
        removeOnComplete: {
          age: 90000, // 25 hours
        },
        removeOnFail: {
          age: 90000, // 25 hours
        },
      },
    });
  }
  return crawlQueue as Queue<T>;
}

