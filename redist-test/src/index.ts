import { RedisBasicExample } from './examples/redis-basic.js';
import { BullMQExample } from './examples/bullmq-example.js';
import { closeRedisConnection } from './config/redis.js';

// 主程序
async function main() {
  console.log('🚀 Redis 和 BullMQ 使用案例演示');
  console.log('=====================================\n');

  try {
    // 检查 Redis 连接
    console.log('🔍 检查 Redis 连接...');
    const redisExample = new RedisBasicExample();
    
    // 运行 Redis 基础操作示例
    console.log('\n📚 开始 Redis 基础操作示例');
    await redisExample.runAllExamples();
    await redisExample.cleanup();
    
    // 等待一下
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 运行 BullMQ 示例
    console.log('\n🔄 开始 BullMQ 队列示例');
    const bullmqExample = new BullMQExample();
    await bullmqExample.runExample();
    await bullmqExample.cleanup();
    
    console.log('\n🎉 所有示例运行完成！');
    
  } catch (error) {
    console.error('❌ 运行错误:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.log('\n💡 提示: 请确保 Redis 服务正在运行');
        console.log('   可以使用以下命令启动 Redis:');
        console.log('   docker-compose up -d');
      }
    }
  } finally {
    // 关闭 Redis 连接
    await closeRedisConnection();
    console.log('\n👋 程序结束');
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

// 处理程序退出信号
process.on('SIGINT', async () => {
  console.log('\n🛑 收到退出信号，正在清理资源...');
  await closeRedisConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 收到终止信号，正在清理资源...');
  await closeRedisConnection();
  process.exit(0);
});

// 运行主程序
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };