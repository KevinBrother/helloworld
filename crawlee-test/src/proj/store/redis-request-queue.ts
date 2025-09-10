import type { Dictionary, BatchAddRequestsResult } from '@crawlee/types';
import { RequestProvider } from 'crawlee';
import type { 
  RequestProviderOptions,
  RequestQueueOperationInfo,
  RequestQueueOperationOptions
} from 'crawlee';
import { Request } from 'crawlee';
import type { Source } from 'crawlee';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

export interface RedisRequestQueueOptions {
  redisUrl?: string;
  queueName: string;
  redis?: Redis;
}

interface RedisRequestData {
  id: string;
  url: string;
  method: string;
  uniqueKey: string;
  payload?: string;
  headers?: Record<string, string>;
  userData?: Dictionary;
  addedAt: string;
  handledAt?: string;
  lockExpiresAt?: number;
  lockByClient?: string;
  forefront?: boolean;
}

export class RedisRequestQueue extends RequestProvider {
  private redis: Redis;
  private queueName: string;
  private clientKey: string;
  private requestLockSecs = 300; // 5 minutes

  constructor(options: RedisRequestQueueOptions) {
    const storageClient = new RedisStorageClient(options);
    
    super({
      id: options.queueName,
      name: options.queueName,
      client: storageClient as any,
      logPrefix: 'RedisRequestQueue',
      requestCacheMaxSize: 2000000,
      recentlyHandledRequestsMaxSize: 1000,
    } as any);

    this.redis = options.redis || new Redis(options.redisUrl || 'redis://localhost:6379');
    this.queueName = options.queueName;
    this.clientKey = `client-${uuidv4()}`;
    
    // Set the redis queue reference in the queue client
    const queueClient = storageClient.requestQueue(options.queueName);
    queueClient.setRedisQueue(this);
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }

  async drop(): Promise<void> {
    const keys = await this.redis.keys(`${this.queueName}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  protected override async ensureHeadIsNonEmpty(): Promise<void> {
    if (this.queueHeadIds.length() > 0) {
      return;
    }

    const headItems = await this.listAndLockHead(25);
    for (const item of headItems) {
      this.queueHeadIds.add(item.id, item.id, item.forefront || false);
      
      // Cache the request
      this._cacheRequest(item.uniqueKey, {
        requestId: item.id,
        uniqueKey: item.uniqueKey,
        wasAlreadyPresent: true,
        wasAlreadyHandled: false,
        forefront: item.forefront || false,
      });
    }
  }

  override async fetchNextRequest<T extends Dictionary = Dictionary>(): Promise<Request<T> | null> {
    await this.ensureHeadIsNonEmpty();
    
    const nextRequestId = this.queueHeadIds.removeFirst();
    if (!nextRequestId) {
      return null;
    }

    const requestData = await this.getRequestFromRedis(nextRequestId);
    if (!requestData) {
      return null;
    }

    if (requestData.handledAt) {
      return null;
    }

    // Convert Redis data to Request object
    const request = new Request<T>({
      id: requestData.id,
      url: requestData.url,
      method: requestData.method as any,
      uniqueKey: requestData.uniqueKey,
      payload: requestData.payload,
      headers: requestData.headers,
      userData: requestData.userData as T,
    });

    return request;
  }

  override async isFinished(): Promise<boolean> {
    if (this.queueHeadIds.length() > 0) {
      return false;
    }

    await this.ensureHeadIsNonEmpty();
    return this.queueHeadIds.length() === 0;
  }

  override async addRequest(
    requestLike: Source,
    options: RequestQueueOperationOptions = {},
  ): Promise<RequestQueueOperationInfo> {
    const request = requestLike instanceof Request ? requestLike : new Request(requestLike);
    const requestId = request.id || uuidv4();
    const uniqueKey = request.uniqueKey;

    // Check if request already exists
    const existingKey = await this.redis.get(`${this.queueName}:unique:${uniqueKey}`);
    if (existingKey) {
      const existingRequest = await this.getRequestFromRedis(existingKey);
      return {
        requestId: existingKey,
        uniqueKey,
        wasAlreadyPresent: true,
        wasAlreadyHandled: !!existingRequest?.handledAt,
        forefront: options.forefront || false,
      };
    }

    // Add new request
    const requestData: RedisRequestData = {
      id: requestId,
      url: request.url,
      method: request.method,
      uniqueKey: request.uniqueKey,
      payload: request.payload,
      headers: request.headers,
      userData: request.userData,
      addedAt: new Date().toISOString(),
      forefront: options.forefront,
    };

    // Store request data
    await this.redis.set(
      `${this.queueName}:request:${requestId}`,
      JSON.stringify(requestData)
    );

    // Map unique key to request ID
    await this.redis.set(`${this.queueName}:unique:${uniqueKey}`, requestId);

    // Add to queue
    const queueKey = options.forefront 
      ? `${this.queueName}:queue:forefront` 
      : `${this.queueName}:queue:normal`;
    
    if (options.forefront) {
      await this.redis.lpush(queueKey, requestId);
    } else {
      await this.redis.rpush(queueKey, requestId);
    }

    return {
      requestId,
      uniqueKey,
      wasAlreadyPresent: false,
      wasAlreadyHandled: false,
      forefront: options.forefront || false,
    };
  }

  override async addRequests(
    requestsLike: (Source)[],
    options: RequestQueueOperationOptions = {},
  ): Promise<BatchAddRequestsResult> {
    const processedRequests: RequestQueueOperationInfo[] = [];
    let unprocessedRequests: (Source)[] = [];

    for (const requestLike of requestsLike) {
      try {
        const result = await this.addRequest(requestLike, options);
        processedRequests.push(result);
      } catch (error) {
        unprocessedRequests.push(requestLike);
      }
    }

    return {
      processedRequests,
      unprocessedRequests,
    };
  }

  override async markRequestHandled(request: Request): Promise<RequestQueueOperationInfo | null> {
    if (!request.id) {
      return null;
    }

    const requestData = await this.getRequestFromRedis(request.id);
    if (!requestData) {
      return null;
    }

    // Mark as handled
    requestData.handledAt = new Date().toISOString();
    
    await this.redis.set(
      `${this.queueName}:request:${request.id}`,
      JSON.stringify(requestData)
    );

    // Remove any locks
    await this.redis.del(`${this.queueName}:lock:${request.id}`);

    return {
      requestId: request.id,
      uniqueKey: request.uniqueKey,
      wasAlreadyPresent: true,
      wasAlreadyHandled: false,
      forefront: requestData.forefront || false,
    };
  }

  private async getRequestFromRedis(requestId: string): Promise<RedisRequestData | null> {
    const data = await this.redis.get(`${this.queueName}:request:${requestId}`);
    return data ? JSON.parse(data) : null;
  }

  private async listAndLockHead(limit: number = 25): Promise<Array<{id: string, uniqueKey: string, forefront?: boolean}>> {
    const results: Array<{id: string, uniqueKey: string, forefront?: boolean}> = [];
    
    // First try forefront queue
    const forefrontQueue = `${this.queueName}:queue:forefront`;
    const normalQueue = `${this.queueName}:queue:normal`;
    
    // Get items from forefront queue first
    let remainingLimit = limit;
    while (remainingLimit > 0) {
      const requestId = await this.redis.lpop(forefrontQueue);
      if (!requestId) break;
      
      const requestData = await this.getRequestFromRedis(requestId);
      if (!requestData || requestData.handledAt) continue;
      
      // Try to lock the request
      const lockKey = `${this.queueName}:lock:${requestId}`;
      const lockExpiry = Date.now() + (this.requestLockSecs * 1000);
      const lockSet = await this.redis.set(lockKey, this.clientKey, 'PX', this.requestLockSecs * 1000, 'NX');
      
      if (lockSet === 'OK') {
        requestData.lockExpiresAt = lockExpiry;
        requestData.lockByClient = this.clientKey;
        
        await this.redis.set(
          `${this.queueName}:request:${requestId}`,
          JSON.stringify(requestData)
        );
        
        results.push({
          id: requestId,
          uniqueKey: requestData.uniqueKey,
          forefront: true
        });
        remainingLimit--;
      }
    }
    
    // Then try normal queue
    while (remainingLimit > 0) {
      const requestId = await this.redis.lpop(normalQueue);
      if (!requestId) break;
      
      const requestData = await this.getRequestFromRedis(requestId);
      if (!requestData || requestData.handledAt) continue;
      
      // Try to lock the request
      const lockKey = `${this.queueName}:lock:${requestId}`;
      const lockExpiry = Date.now() + (this.requestLockSecs * 1000);
      const lockSet = await this.redis.set(lockKey, this.clientKey, 'PX', this.requestLockSecs * 1000, 'NX');
      
      if (lockSet === 'OK') {
        requestData.lockExpiresAt = lockExpiry;
        requestData.lockByClient = this.clientKey;
        
        await this.redis.set(
          `${this.queueName}:request:${requestId}`,
          JSON.stringify(requestData)
        );
        
        results.push({
          id: requestId,
          uniqueKey: requestData.uniqueKey,
          forefront: false
        });
        remainingLimit--;
      }
    }
    
    return results;
  }

  override async getRequest(id: string): Promise<Request | null> {
    const requestData = await this.getRequestFromRedis(id);
    if (!requestData) {
      return null;
    }

    return new Request({
      id: requestData.id,
      url: requestData.url,
      method: requestData.method as any,
      uniqueKey: requestData.uniqueKey,
      payload: requestData.payload,
      headers: requestData.headers,
      userData: requestData.userData,
    });
  }
}

// Redis storage client that implements the StorageClient interface
class RedisStorageClient {
  private queueClient: RedisRequestQueueClient;

  constructor(private options: RedisRequestQueueOptions) {
    this.queueClient = new RedisRequestQueueClient(options);
  }

  requestQueue(id: string): RedisRequestQueueClient {
    return this.queueClient;
  }

  datasets() {
    throw new Error('Datasets not implemented for Redis storage client');
  }

  dataset() {
    throw new Error('Dataset not implemented for Redis storage client');
  }

  keyValueStores() {
    throw new Error('Key-value stores not implemented for Redis storage client');
  }

  keyValueStore() {
    throw new Error('Key-value store not implemented for Redis storage client');
  }

  requestQueues() {
    throw new Error('Request queues collection not implemented for Redis storage client');
  }
}

// Minimal RequestQueueClient implementation for compatibility
class RedisRequestQueueClient {
  private redisQueue?: RedisRequestQueue;

  constructor(private options: RedisRequestQueueOptions) {}

  setRedisQueue(queue: RedisRequestQueue) {
    this.redisQueue = queue;
  }

  async get() {
    return {
      id: this.options.queueName,
      name: this.options.queueName,
      userId: 'redis-user',
      createdAt: new Date(),
      modifiedAt: new Date(),
      accessedAt: new Date(),
      totalRequestCount: 0,
      handledRequestCount: 0,
      pendingRequestCount: 0,
    };
  }

  async update() {
    return this.get();
  }

  async delete() {
    if (this.redisQueue) {
      await this.redisQueue.drop();
    }
  }

  async listHead() {
    return { items: [] };
  }

  async addRequest() {
    throw new Error('Use RedisRequestQueue methods directly');
  }

  async batchAddRequests() {
    throw new Error('Use RedisRequestQueue methods directly');
  }

  async getRequest(id: string) {
    if (this.redisQueue) {
      const request = await this.redisQueue.getRequest(id);
      return request ? {
        url: request.url,
        method: request.method,
        uniqueKey: request.uniqueKey,
        payload: request.payload,
        headers: request.headers,
        userData: request.userData,
      } : undefined;
    }
    return undefined;
  }

  async updateRequest() {
    throw new Error('Use RedisRequestQueue methods directly');
  }

  async deleteRequest() {
    throw new Error('Use RedisRequestQueue methods directly');
  }

  async listAndLockHead() {
    return {
      items: [],
      queueHasLockedRequests: false,
    };
  }

  async prolongRequestLock() {
    return {
      lockExpiresAt: new Date(Date.now() + 300000), // 5 minutes
    };
  }

  async deleteRequestLock() {
    // Implementation for lock deletion
  }
}