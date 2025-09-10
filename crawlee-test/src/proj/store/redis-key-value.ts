import Redis from "ioredis";

class RedisKeyValueStore {
  private redis: Redis;
  private prefix: string;

  constructor(storeName: string, redisUrl?: string) {
    this.redis = new Redis(redisUrl || 'redis://localhost:6379');
    this.prefix = `crawlee:${storeName}:`;
  }

  async setValue(key: string, value: unknown): Promise<void> {
    await this.redis.set(`${this.prefix}${key}`, JSON.stringify(value));
  }

  async getValue(key: string): Promise<unknown> {
    const data = await this.redis.get(`${this.prefix}${key}`);
    return data ? JSON.parse(data) : null;
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}