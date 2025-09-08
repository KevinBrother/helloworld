import { getRedisClient, closeRedisConnection } from '../config/redis.js';

// Redis 基础操作示例
export class RedisBasicExample {
  private redis = getRedisClient();

  // 字符串操作
  async stringOperations() {
    console.log('\n=== Redis 字符串操作示例 ===');
    
    // 设置和获取字符串
    await this.redis.set('user:1:name', '张三');
    const name = await this.redis.get('user:1:name');
    console.log('用户名:', name);
    
    // 设置带过期时间的键
    await this.redis.setex('session:abc123', 3600, 'user_data');
    const ttl = await this.redis.ttl('session:abc123');
    console.log('会话过期时间:', ttl, '秒');
    
    // 数字操作
    await this.redis.set('counter', 0);
    await this.redis.incr('counter');
    await this.redis.incrby('counter', 5);
    const counter = await this.redis.get('counter');
    console.log('计数器值:', counter);
  }

  // 哈希操作
  async hashOperations() {
    console.log('\n=== Redis 哈希操作示例 ===');
    
    // 设置哈希字段
    await this.redis.hset('user:1', {
      name: '张三',
      age: '25',
      email: 'zhangsan@example.com'
    });
    
    // 获取哈希字段
    const user = await this.redis.hgetall('user:1');
    console.log('用户信息:', user);
    
    // 获取单个字段
    const age = await this.redis.hget('user:1', 'age');
    console.log('用户年龄:', age);
    
    // 检查字段是否存在
    const hasPhone = await this.redis.hexists('user:1', 'phone');
    console.log('是否有电话字段:', hasPhone);
  }

  // 列表操作
  async listOperations() {
    console.log('\n=== Redis 列表操作示例 ===');
    
    // 左侧推入元素
    await this.redis.lpush('tasks', 'task1', 'task2', 'task3');
    
    // 右侧推入元素
    await this.redis.rpush('tasks', 'task4');
    
    // 获取列表长度
    const length = await this.redis.llen('tasks');
    console.log('任务列表长度:', length);
    
    // 获取列表范围
    const tasks = await this.redis.lrange('tasks', 0, -1);
    console.log('所有任务:', tasks);
    
    // 弹出元素
    const task = await this.redis.lpop('tasks');
    console.log('弹出的任务:', task);
  }

  // 集合操作
  async setOperations() {
    console.log('\n=== Redis 集合操作示例 ===');
    
    // 添加集合成员
    await this.redis.sadd('tags', 'javascript', 'typescript', 'node.js', 'redis');
    
    // 获取所有成员
    const tags = await this.redis.smembers('tags');
    console.log('所有标签:', tags);
    
    // 检查成员是否存在
    const hasJs = await this.redis.sismember('tags', 'javascript');
    console.log('是否包含 javascript:', hasJs);
    
    // 获取集合大小
    const size = await this.redis.scard('tags');
    console.log('标签数量:', size);
    
    // 随机获取成员
    const randomTag = await this.redis.srandmember('tags');
    console.log('随机标签:', randomTag);
  }

  // 有序集合操作
  async sortedSetOperations() {
    console.log('\n=== Redis 有序集合操作示例 ===');
    
    // 添加有序集合成员
    await this.redis.zadd('scores', 100, 'alice', 85, 'bob', 92, 'charlie');
    
    // 按分数范围获取成员
    const topScores = await this.redis.zrevrange('scores', 0, 2, 'WITHSCORES');
    console.log('前三名分数:', topScores);
    
    // 获取成员分数
    const aliceScore = await this.redis.zscore('scores', 'alice');
    console.log('Alice 的分数:', aliceScore);
    
    // 获取成员排名
    const bobRank = await this.redis.zrevrank('scores', 'bob');
    console.log('Bob 的排名:', bobRank !== null ? bobRank + 1 : null);
  }

  // 键操作
  async keyOperations() {
    console.log('\n=== Redis 键操作示例 ===');
    
    // 检查键是否存在
    const exists = await this.redis.exists('user:1');
    console.log('user:1 是否存在:', exists);
    
    // 设置键过期时间
    await this.redis.expire('user:1', 300);
    const ttl = await this.redis.ttl('user:1');
    console.log('user:1 过期时间:', ttl, '秒');
    
    // 获取匹配的键
    const keys = await this.redis.keys('user:*');
    console.log('匹配 user:* 的键:', keys);
    
    // 获取键的类型
    const type = await this.redis.type('user:1');
    console.log('user:1 的类型:', type);
  }

  // 运行所有示例
  async runAllExamples() {
    try {
      await this.stringOperations();
      await this.hashOperations();
      await this.listOperations();
      await this.setOperations();
      await this.sortedSetOperations();
      await this.keyOperations();
      
      console.log('\n=== Redis 基础操作示例完成 ===');
    } catch (error) {
      console.error('Redis 操作错误:', error);
    }
  }

  // 清理测试数据
  async cleanup() {
    const keys = await this.redis.keys('user:*');
    keys.push('counter', 'session:*', 'tasks', 'tags', 'scores');
    
    for (const key of keys) {
      if (key.includes('*')) {
        const matchedKeys = await this.redis.keys(key);
        if (matchedKeys.length > 0) {
          await this.redis.del(...matchedKeys);
        }
      } else {
        await this.redis.del(key);
      }
    }
    
    console.log('测试数据已清理');
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  const example = new RedisBasicExample();
  
  example.runAllExamples()
    .then(() => example.cleanup())
    .then(() => closeRedisConnection())
    .catch(console.error);
}