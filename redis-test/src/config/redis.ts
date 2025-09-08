import Redis from 'ioredis';

// Redis 连接配置
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: null, // Error: BullMQ: Your redis options maxRetriesPerRequest must be null.
  lazyConnect: true,
};

// 创建 Redis 客户端实例
export const createRedisClient = (): Redis => {
  const client = new Redis(redisConfig);
  
  client.on('connect', () => {
    console.log('Redis 连接成功');
  });
  
  client.on('error', (err) => {
    console.error('Redis 连接错误:', err);
  });
  
  client.on('close', () => {
    console.log('Redis 连接已关闭');
  });
  
  return client;
};

// 单例 Redis 客户端
let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
};

// 关闭 Redis 连接
export const closeRedisConnection = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};