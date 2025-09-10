import type {
  RequestQueueClient,
  RequestQueueInfo,
  QueueOperationInfo,
  RequestSchema,
  RequestOptions,
  QueueHead,
  ListAndLockOptions,
  ListAndLockHeadResult,
  ProlongRequestLockOptions,
  ProlongRequestLockResult,
  DeleteRequestLockOptions,
  UpdateRequestSchema,
  BatchAddRequestsResult,
  ListOptions,
  RequestQueueHeadItem,
  AllowedHttpMethods,
  ProcessedRequest,
  UnprocessedRequest
} from '@crawlee/types';
import Redis, { RedisOptions } from 'ioredis';
import Redlock from 'redlock'; // 用于分布式锁

interface InternalRequest {
  id: string;
  orderNo: number | null;
  url: string;
  uniqueKey: string;
  method: AllowedHttpMethods;
  retryCount: number;
  json: string;
  lockedAt?: Date;
  lockExpiresAt?: Date;
}

interface RedisRequestQueueOptions {
  redisOptions?: RedisOptions;
  prefix?: string;
  ttlSeconds?: number;
}

export class RedisRequestQueueClient implements RequestQueueClient {
  private readonly redis: Redis;
  private readonly prefix: string;
  private readonly redlock: Redlock;
  private readonly ttlSeconds: number | undefined;
  private id?: string;

  constructor(id: string,options: RedisRequestQueueOptions = {}) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      ...options.redisOptions,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 10,
      connectTimeout: 10000,
    });
    this.prefix = options.prefix || 'crawlee:';
    this.ttlSeconds = options.ttlSeconds;
    this.redlock = new Redlock([this.redis], {
      retryCount: 10,
      retryDelay: 200,
    });

    this.redis.on('error', (err) =>
      console.error(`RedisRequestQueueClient error: ${err.message}`)
    );
  }

  // 获取或创建队列
  async get(): Promise<RequestQueueInfo | undefined> {
    const id = this.id;
    if (!id) throw new Error('Queue ID not set');
    
    try {
      const queueKey = `${this.prefix}${id}:meta`;
      const data = await this.redis.hgetall(queueKey);
      if (!Object.keys(data).length) return undefined;

      return {
        id,
        name: data.name || id,
        createdAt: new Date(Number(data.createdAt)),
        modifiedAt: new Date(Number(data.modifiedAt)),
        accessedAt: new Date(Number(data.accessedAt) || Number(data.modifiedAt)),
        totalRequestCount: Number(data.totalRequestCount) || 0,
        handledRequestCount: Number(data.handledRequestCount) || 0,
        pendingRequestCount: (Number(data.totalRequestCount) || 0) - (Number(data.handledRequestCount) || 0),
      };
    } catch (error) {
      console.error(`Failed to get queue ${id}:`, error);
      throw error;
    }
  }

  async update(newFields: { name?: string }): Promise<Partial<RequestQueueInfo> | undefined> {
    const id = this.id;
    if (!id) throw new Error('Queue ID not set');
    
    const queueKey = `${this.prefix}${id}:meta`;
    const updates: Record<string, any> = {
      modifiedAt: Date.now(),
    };
    
    if (newFields.name) {
      updates.name = newFields.name;
    }
    
    await this.redis.hset(queueKey, updates);
    return this.get();
  }

  async delete(): Promise<void> {
    const id = this.id;
    if (!id) throw new Error('Queue ID not set');
    await this.deleteQueue(id);
  }

  async getOrCreateQueue(id: string): Promise<RequestQueueInfo> {
    const queueKey = `${this.prefix}${id}:meta`;
    const lock = await this.redlock.acquire([`${queueKey}:lock`], 1000);
    try {
      const exists = await this.redis.exists(queueKey);
      if (!exists) {
        const now = Date.now();
        await this.redis.hset(queueKey, {
          id,
          createdAt: now,
          modifiedAt: now,
          totalRequestCount: 0,
          handledRequestCount: 0,
        });
        if (this.ttlSeconds) {
          await this.redis.expire(queueKey, this.ttlSeconds);
        }
      }
      const info = await this.getQueueInfo(id);
      if (!info) {
        throw new Error(`Failed to create or retrieve queue ${id}`);
      }
      return info;
    } finally {
      await lock.release();
    }
  }

  private async getQueueInfo(id: string): Promise<RequestQueueInfo | null> {
    try {
      const queueKey = `${this.prefix}${id}:meta`;
      const data = await this.redis.hgetall(queueKey);
      if (!Object.keys(data).length) return null;

      return {
        id,
        name: data.name || id,
        createdAt: new Date(Number(data.createdAt)),
        modifiedAt: new Date(Number(data.modifiedAt)),
        accessedAt: new Date(Number(data.accessedAt) || Number(data.modifiedAt)),
        totalRequestCount: Number(data.totalRequestCount) || 0,
        handledRequestCount: Number(data.handledRequestCount) || 0,
        pendingRequestCount: (Number(data.totalRequestCount) || 0) - (Number(data.handledRequestCount) || 0),
      };
    } catch (error) {
      console.error(`Failed to get queue ${id}:`, error);
      throw error;
    }
  }

  async listAllQueues(): Promise<RequestQueueInfo[]> {
    const pattern = `${this.prefix}*:meta`;
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, batchKeys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );
      cursor = nextCursor;
      keys.push(...batchKeys);
    } while (cursor !== '0');

    const queues: RequestQueueInfo[] = [];
    for (const key of keys) {
      const info = await this.getQueueInfo(
        key.replace(`${this.prefix}`, '').replace(':meta', '')
      );
      if (info) queues.push(info);
    }
    return queues;
  }

  setId(id: string): void {
    this.id = id;
  }

  async addRequest(
    request: RequestSchema,
    options?: RequestOptions
  ): Promise<QueueOperationInfo> {
    const id = this.id;
    if (!id) throw new Error('Queue ID not set');

    const internalRequest: InternalRequest = {
      id: request.id || crypto.randomUUID(),
      orderNo: null,
      url: request.url,
      uniqueKey: request.uniqueKey,
      method: (request.method as AllowedHttpMethods) || 'GET',
      retryCount: 0,
      json: JSON.stringify(request),
    };

    await this.createRequest(id, internalRequest, { forefront: options?.forefront });
    
    return {
      requestId: internalRequest.id,
      wasAlreadyPresent: false,
      wasAlreadyHandled: false,
    };
  }

  async batchAddRequests(
    requests: RequestSchema[],
    options?: RequestOptions
  ): Promise<BatchAddRequestsResult> {
    const processedRequests: ProcessedRequest[] = [];
    const unprocessedRequests: UnprocessedRequest[] = [];
    
    for (const request of requests) {
      try {
        const result = await this.addRequest(request, options);
        processedRequests.push({
          uniqueKey: request.uniqueKey,
          requestId: result.requestId,
          wasAlreadyPresent: result.wasAlreadyPresent,
          wasAlreadyHandled: result.wasAlreadyHandled,
        });
      } catch (error) {
        unprocessedRequests.push({
          uniqueKey: request.uniqueKey,
          url: request.url,
          method: request.method,
        });
      }
    }
    
    return {
      processedRequests,
      unprocessedRequests,
    };
  }

  private async createRequest(
    id: string,
    request: InternalRequest,
    options?: { forefront?: boolean }
  ): Promise<void> {
    const queueKey = `${this.prefix}${id}:meta`;
    const requestKey = `${this.prefix}${id}:requests:${request.id}`;
    const queueList = `${this.prefix}${id}:queue`;
    const queueSet = `${this.prefix}${id}:set`;

    const lock = await this.redlock.acquire([`${queueKey}:lock`], 1000);
    try {
      // 检查去重
      const exists = await this.redis.sismember(queueSet, request.id);
      if (exists) return;

      // 存储请求
      await this.redis.set(requestKey, JSON.stringify(request));
      if (this.ttlSeconds) {
        await this.redis.expire(requestKey, this.ttlSeconds);
      }

      // 更新队列
      await this.redis.sadd(queueSet, request.id);
      const listOp = options?.forefront ? 'lpush' : 'rpush';
      await this.redis[listOp](queueList, request.id);

      // 更新元数据
      await this.redis.hincrby(queueKey, 'totalRequestCount', 1);
      await this.redis.hset(queueKey, 'modifiedAt', Date.now());
      if (this.ttlSeconds) {
        await this.redis.expire(queueList, this.ttlSeconds);
        await this.redis.expire(queueSet, this.ttlSeconds);
      }
    } catch (error) {
      console.error(`Failed to create request ${request.id} in queue ${id}:`, error);
      throw error;
    } finally {
      await lock.release();
    }
  }

  async getRequest(requestId: string): Promise<RequestOptions | undefined> {
    const id = this.id;
    if (!id) throw new Error('Queue ID not set');
    
    try {
      const requestKey = `${this.prefix}${id}:requests:${requestId}`;
      const data = await this.redis.get(requestKey);
      if (!data) return undefined;
      
      const internalRequest: InternalRequest = JSON.parse(data);
      return JSON.parse(internalRequest.json);
    } catch (error) {
      console.error(`Failed to get request ${requestId} from queue ${id}:`, error);
      return undefined;
    }
  }

  private async getInternalRequest(
    id: string,
    requestId: string
  ): Promise<InternalRequest | null> {
    try {
      const requestKey = `${this.prefix}${id}:requests:${requestId}`;
      const data = await this.redis.get(requestKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Failed to get request ${requestId} from queue ${id}:`, error);
      return null;
    }
  }

  async updateRequest(
    request: UpdateRequestSchema,
    options?: RequestOptions
  ): Promise<QueueOperationInfo> {
    const id = this.id;
    if (!id) throw new Error('Queue ID not set');
    
    const requestId = request.id;
    if (!requestId) throw new Error('Request ID is required for update');
    
    const existingRequest = await this.getInternalRequest(id, requestId);
    if (!existingRequest) {
      throw new Error(`Request ${requestId} not found`);
    }
    
    const updatedRequest: InternalRequest = {
      ...existingRequest,
      json: JSON.stringify({ ...JSON.parse(existingRequest.json), ...request }),
    };
    
    await this.updateInternalRequest(id, requestId, updatedRequest);
    
    return {
      requestId,
      wasAlreadyPresent: true,
      wasAlreadyHandled: false,
    };
  }

  private async updateInternalRequest(
    id: string,
    requestId: string,
    request: InternalRequest
  ): Promise<void> {
    const requestKey = `${this.prefix}${id}:requests:${requestId}`;
    const queueKey = `${this.prefix}${id}:meta`;
    await this.redis.set(requestKey, JSON.stringify(request));
    await this.redis.hset(queueKey, 'modifiedAt', Date.now());
    if (this.ttlSeconds) {
      await this.redis.expire(requestKey, this.ttlSeconds);
    }
  }

  async deleteRequest(requestId: string): Promise<unknown> {
    const id = this.id;
    if (!id) throw new Error('Queue ID not set');
    
    await this.deleteInternalRequest(id, requestId);
    return {};
  }

  private async deleteInternalRequest(id: string, requestId: string): Promise<void> {
    const requestKey = `${this.prefix}${id}:requests:${requestId}`;
    const queueKey = `${this.prefix}${id}:meta`;
    const queueSet = `${this.prefix}${id}:set`;
    const queueList = `${this.prefix}${id}:queue`;
    
    const lock = await this.redlock.acquire([`${queueKey}:lock`], 1000);
    try {
      await this.redis.del(requestKey);
      await this.redis.srem(queueSet, requestId);
      await this.redis.lrem(queueList, 0, requestId);
      await this.redis.hset(queueKey, 'modifiedAt', Date.now());
    } finally {
      await lock.release();
    }
  }

  async listHead(options?: ListOptions): Promise<QueueHead> {
    const id = this.id;
    if (!id) throw new Error('Queue ID not set');
    
    const limit = options?.limit || 100;
    const queueList = `${this.prefix}${id}:queue`;
    const queueKey = `${this.prefix}${id}:meta`;
    
    const requestIds = await this.redis.lrange(queueList, 0, limit - 1);
    const items: RequestQueueHeadItem[] = [];
    
    for (const requestId of requestIds) {
      const request = await this.getInternalRequest(id, requestId);
      if (request) {
        items.push({
          id: request.id,
          retryCount: request.retryCount,
          uniqueKey: request.uniqueKey,
          url: request.url,
          method: request.method,
        });
      }
    }
    
    const metaData = await this.redis.hgetall(queueKey);
    
    return {
      limit,
      queueModifiedAt: new Date(Number(metaData.modifiedAt) || Date.now()),
      items,
    };
  }

  async listAndLockHead(options: ListAndLockOptions): Promise<ListAndLockHeadResult> {
    const id = this.id;
    if (!id) throw new Error('Queue ID not set');
    
    const limit = options.limit || 100;
    const lockSecs = options.lockSecs || 300;
    const queueList = `${this.prefix}${id}:queue`;
    const queueKey = `${this.prefix}${id}:meta`;
    
    const lock = await this.redlock.acquire([`${queueKey}:lock`], 1000);
    try {
      const requestIds = await this.redis.lrange(queueList, 0, limit - 1);
      const items: RequestQueueHeadItem[] = [];
      const now = new Date();
      const lockExpiresAt = new Date(now.getTime() + lockSecs * 1000);
      
      for (const requestId of requestIds) {
        const request = await this.getInternalRequest(id, requestId);
        if (request && (!request.lockedAt || new Date(request.lockedAt) < now)) {
          request.lockedAt = now;
          request.lockExpiresAt = lockExpiresAt;
          await this.updateInternalRequest(id, requestId, request);
          
          items.push({
            id: request.id,
            retryCount: request.retryCount,
            uniqueKey: request.uniqueKey,
            url: request.url,
            method: request.method,
          });
        }
      }
      
      const metaData = await this.redis.hgetall(queueKey);
      
      return {
        limit,
        queueModifiedAt: new Date(Number(metaData.modifiedAt) || Date.now()),
        items,
        lockSecs,
      };
    } finally {
      await lock.release();
    }
  }

  async prolongRequestLock(
    requestId: string,
    options: ProlongRequestLockOptions
  ): Promise<ProlongRequestLockResult> {
    const id = this.id;
    if (!id) throw new Error('Queue ID not set');
    
    const lockSecs = options.lockSecs || 300;
    const request = await this.getInternalRequest(id, requestId);
    
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }
    
    const now = new Date();
    request.lockExpiresAt = new Date(now.getTime() + lockSecs * 1000);
    await this.updateInternalRequest(id, requestId, request);
    
    return {
      lockExpiresAt: request.lockExpiresAt,
    };
  }

  async deleteRequestLock(
    requestId: string,
    options?: DeleteRequestLockOptions
  ): Promise<void> {
    const id = this.id;
    if (!id) throw new Error('Queue ID not set');
    
    const request = await this.getInternalRequest(id, requestId);
    if (request) {
      delete request.lockedAt;
      delete request.lockExpiresAt;
      await this.updateInternalRequest(id, requestId, request);
    }
  }

  private async getNextInternalRequest(id: string): Promise<InternalRequest | null> {
    const queueList = `${this.prefix}${id}:queue`;
    const queueKey = `${this.prefix}${id}:meta`;
    const queueSet = `${this.prefix}${id}:set`;
    
    const lock = await this.redlock.acquire([`${queueKey}:lock`], 1000);
    try {
      const requestId = await this.redis.lpop(queueList);
      if (!requestId) return null;

      const request = await this.getInternalRequest(id, requestId);
      if (request) {
        await this.redis.srem(queueSet, requestId);
        await this.redis.hincrby(queueKey, 'handledRequestCount', 1);
        await this.redis.hset(queueKey, 'modifiedAt', Date.now());
        return request;
      } else {
        await this.redis.srem(queueSet, requestId);
        return null;
      }
    } finally {
      await lock.release();
    }
  }

  private async deleteQueue(id: string): Promise<void> {
    const pattern = `${this.prefix}${id}:*`;
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, batchKeys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );
      cursor = nextCursor;
      keys.push(...batchKeys);
    } while (cursor !== '0');

    if (keys.length) {
      await this.redis.del(...keys);
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }

  // Factory method for creating a client with ID
  static create(id: string, options: RedisRequestQueueOptions = {}): RedisRequestQueueClient {
    const client = new RedisRequestQueueClient(options);
    client.setId(id);
    return client;
  }
}
