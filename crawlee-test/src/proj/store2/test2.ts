import { Configuration, StorageClient } from 'crawlee';
import { RedisRequestQueueClient } from './redis-request-queue-client';

// 自定义 Configuration，仅替换 RequestQueue
const config = new Configuration({
  storageClient: {
    requestQueues: () =>
      new RedisRequestQueueClient({ redisOptions, ttlSeconds: 604800 }), // 7 天 TTL
    datasets: () => new StorageClient().datasets(), // 默认文件系统
    keyValueStores: () => new MemoryStorageClient().keyValueStores(), // 默认文件系统
  },
});
