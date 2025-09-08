import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getRedisClient, closeRedisConnection } from '../src/config/redis.js';
import type Redis from 'ioredis';

describe('Redis 基础操作测试', () => {
  let redis: Redis;

  beforeAll(async () => {
    redis = getRedisClient();
    // 等待连接建立
    await redis.ping();
  });

  afterAll(async () => {
    await closeRedisConnection();
  });

  beforeEach(async () => {
    // 清理测试数据
    await redis.flushdb();
  });

  describe('字符串操作', () => {
    it('应该能够设置和获取字符串值', async () => {
      await redis.set('test:key', 'test:value');
      const value = await redis.get('test:key');
      expect(value).toBe('test:value');
    });

    it('应该能够设置带过期时间的键', async () => {
      await redis.setex('test:expire', 1, 'value');
      const value = await redis.get('test:expire');
      expect(value).toBe('value');
      
      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 1100));
      const expiredValue = await redis.get('test:expire');
      expect(expiredValue).toBeNull();
    });

    it('应该能够进行数字操作', async () => {
      await redis.set('test:counter', '0');
      await redis.incr('test:counter');
      await redis.incrby('test:counter', 5);
      const value = await redis.get('test:counter');
      expect(value).toBe('6');
    });
  });

  describe('哈希操作', () => {
    it('应该能够设置和获取哈希字段', async () => {
      await redis.hset('test:hash', 'field1', 'value1');
      await redis.hset('test:hash', 'field2', 'value2');
      
      const value1 = await redis.hget('test:hash', 'field1');
      const value2 = await redis.hget('test:hash', 'field2');
      
      expect(value1).toBe('value1');
      expect(value2).toBe('value2');
    });

    it('应该能够获取所有哈希字段', async () => {
      await redis.hset('test:hash', {
        name: '张三',
        age: '25',
        city: '北京'
      });
      
      const hash = await redis.hgetall('test:hash');
      expect(hash).toEqual({
        name: '张三',
        age: '25',
        city: '北京'
      });
    });

    it('应该能够检查字段是否存在', async () => {
      await redis.hset('test:hash', 'existing', 'value');
      
      const exists = await redis.hexists('test:hash', 'existing');
      const notExists = await redis.hexists('test:hash', 'nonexistent');
      
      expect(exists).toBe(1);
      expect(notExists).toBe(0);
    });
  });

  describe('列表操作', () => {
    it('应该能够推入和弹出元素', async () => {
      await redis.lpush('test:list', 'item1', 'item2', 'item3');
      
      const length = await redis.llen('test:list');
      expect(length).toBe(3);
      
      const item = await redis.lpop('test:list');
      expect(item).toBe('item3'); // LPUSH 是从左边推入，所以最后推入的先弹出
      
      const newLength = await redis.llen('test:list');
      expect(newLength).toBe(2);
    });

    it('应该能够获取列表范围', async () => {
      await redis.rpush('test:list', 'a', 'b', 'c', 'd');
      
      const all = await redis.lrange('test:list', 0, -1);
      expect(all).toEqual(['a', 'b', 'c', 'd']);
      
      const partial = await redis.lrange('test:list', 1, 2);
      expect(partial).toEqual(['b', 'c']);
    });
  });

  describe('集合操作', () => {
    it('应该能够添加和检查集合成员', async () => {
      await redis.sadd('test:set', 'member1', 'member2', 'member3');
      
      const isMember = await redis.sismember('test:set', 'member1');
      const isNotMember = await redis.sismember('test:set', 'nonexistent');
      
      expect(isMember).toBe(1);
      expect(isNotMember).toBe(0);
    });

    it('应该能够获取集合大小和所有成员', async () => {
      await redis.sadd('test:set', 'a', 'b', 'c');
      
      const size = await redis.scard('test:set');
      expect(size).toBe(3);
      
      const members = await redis.smembers('test:set');
      expect(members.sort()).toEqual(['a', 'b', 'c']);
    });
  });

  describe('有序集合操作', () => {
    it('应该能够添加和获取有序集合成员', async () => {
      await redis.zadd('test:zset', 100, 'alice', 85, 'bob', 92, 'charlie');
      
      const aliceScore = await redis.zscore('test:zset', 'alice');
      expect(aliceScore).toBe('100');
      
      const topTwo = await redis.zrevrange('test:zset', 0, 1);
      expect(topTwo).toEqual(['alice', 'charlie']);
    });

    it('应该能够获取成员排名', async () => {
      await redis.zadd('test:zset', 100, 'alice', 85, 'bob', 92, 'charlie');
      
      const aliceRank = await redis.zrevrank('test:zset', 'alice');
      const bobRank = await redis.zrevrank('test:zset', 'bob');
      
      expect(aliceRank).toBe(0); // 最高分，排名第一（索引0）
      expect(bobRank).toBe(2);   // 最低分，排名第三（索引2）
    });
  });

  describe('键操作', () => {
    it('应该能够检查键是否存在', async () => {
      await redis.set('test:exists', 'value');
      
      const exists = await redis.exists('test:exists');
      const notExists = await redis.exists('test:nonexistent');
      
      expect(exists).toBe(1);
      expect(notExists).toBe(0);
    });

    it('应该能够设置和检查键的过期时间', async () => {
      await redis.set('test:ttl', 'value');
      await redis.expire('test:ttl', 10);
      
      const ttl = await redis.ttl('test:ttl');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(10);
    });

    it('应该能够获取键的类型', async () => {
      await redis.set('test:string', 'value');
      await redis.hset('test:hash', 'field', 'value');
      await redis.lpush('test:list', 'item');
      
      const stringType = await redis.type('test:string');
      const hashType = await redis.type('test:hash');
      const listType = await redis.type('test:list');
      
      expect(stringType).toBe('string');
      expect(hashType).toBe('hash');
      expect(listType).toBe('list');
    });

    it('应该能够使用模式匹配查找键', async () => {
      await redis.set('user:1:name', 'alice');
      await redis.set('user:2:name', 'bob');
      await redis.set('product:1:name', 'laptop');
      
      const userKeys = await redis.keys('user:*');
      expect(userKeys.sort()).toEqual(['user:1:name', 'user:2:name']);
      
      const allKeys = await redis.keys('*');
      expect(allKeys.length).toBe(3);
    });
  });
});