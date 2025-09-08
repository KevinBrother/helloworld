import { Queue, Worker, Job } from 'bullmq';
import { redisConfig } from '../config/redis.js';

// 定义任务数据类型
interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

interface ImageProcessJobData {
  imageUrl: string;
  operations: string[];
  outputFormat: string;
}

interface ReportJobData {
  userId: string;
  reportType: 'daily' | 'weekly' | 'monthly';
  dateRange: {
    start: string;
    end: string;
  };
}

// BullMQ 队列示例
export class BullMQExample {
  private emailQueue: Queue<EmailJobData>;
  private imageQueue: Queue<ImageProcessJobData>;
  private reportQueue: Queue<ReportJobData>;
  private workers: Worker[] = [];

  constructor() {
    // 创建队列
    this.emailQueue = new Queue<EmailJobData>('email', {
      connection: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.imageQueue = new Queue<ImageProcessJobData>('image-processing', {
      connection: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 5,
        removeOnFail: 3,
        attempts: 2,
      },
    });

    this.reportQueue = new Queue<ReportJobData>('report-generation', {
      connection: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 20,
        removeOnFail: 10,
      },
    });
  }

  // 创建工作者
  createWorkers() {
    // 邮件发送工作者
    const emailWorker = new Worker<EmailJobData>(
      'email',
      async (job: Job<EmailJobData>) => {
        const { to, subject, body } = job.data;
        console.log(`📧 发送邮件给 ${to}`);
        console.log(`   主题: ${subject}`);
        console.log(`   内容: ${body.substring(0, 50)}...`);
        
        // 模拟邮件发送延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 模拟偶尔失败
        if (Math.random() < 0.1) {
          throw new Error('邮件发送失败');
        }
        
        console.log(`✅ 邮件发送成功: ${job.id}`);
        return { status: 'sent', timestamp: new Date().toISOString() };
      },
      {
        connection: redisConfig,
        concurrency: 3,
      }
    );

    // 图片处理工作者
    const imageWorker = new Worker<ImageProcessJobData>(
      'image-processing',
      async (job: Job<ImageProcessJobData>) => {
        const { imageUrl, operations, outputFormat } = job.data;
        console.log(`🖼️  处理图片: ${imageUrl}`);
        console.log(`   操作: ${operations.join(', ')}`);
        console.log(`   输出格式: ${outputFormat}`);
        
        // 模拟图片处理时间
        const processingTime = 2000 + Math.random() * 3000;
        await new Promise(resolve => setTimeout(resolve, processingTime));
        
        const outputUrl = `processed_${Date.now()}.${outputFormat}`;
        console.log(`✅ 图片处理完成: ${job.id} -> ${outputUrl}`);
        
        return {
          originalUrl: imageUrl,
          processedUrl: outputUrl,
          operations,
          processingTime: Math.round(processingTime),
        };
      },
      {
        connection: redisConfig,
        concurrency: 2,
      }
    );

    // 报告生成工作者
    const reportWorker = new Worker<ReportJobData>(
      'report-generation',
      async (job: Job<ReportJobData>) => {
        const { userId, reportType, dateRange } = job.data;
        console.log(`📊 生成${reportType}报告 for 用户 ${userId}`);
        console.log(`   时间范围: ${dateRange.start} 到 ${dateRange.end}`);
        
        // 模拟报告生成时间
        const generationTime = 3000 + Math.random() * 5000;
        await new Promise(resolve => setTimeout(resolve, generationTime));
        
        const reportId = `report_${userId}_${reportType}_${Date.now()}`;
        console.log(`✅ 报告生成完成: ${job.id} -> ${reportId}`);
        
        return {
          reportId,
          userId,
          reportType,
          dateRange,
          generatedAt: new Date().toISOString(),
          fileSize: Math.round(Math.random() * 1000000), // 模拟文件大小
        };
      },
      {
        connection: redisConfig,
        concurrency: 1,
      }
    );

    // 添加事件监听器
    this.addEventListeners(emailWorker, 'Email');
    this.addEventListeners(imageWorker, 'Image');
    this.addEventListeners(reportWorker, 'Report');

    this.workers = [emailWorker, imageWorker, reportWorker];
  }

  // 添加事件监听器
  private addEventListeners(worker: Worker, workerName: string) {
    worker.on('completed', (job) => {
      console.log(`🎉 ${workerName} 任务完成: ${job.id}`);
    });

    worker.on('failed', (job, err) => {
      console.log(`❌ ${workerName} 任务失败: ${job?.id}, 错误: ${err.message}`);
    });

    worker.on('progress', (job, progress) => {
      console.log(`⏳ ${workerName} 任务进度: ${job.id} - ${progress}%`);
    });
  }

  // 添加邮件任务
  async addEmailJobs() {
    console.log('\n=== 添加邮件任务 ===');
    
    const emailJobs = [
      {
        to: 'user1@example.com',
        subject: '欢迎注册',
        body: '感谢您注册我们的服务，请点击链接激活账户...'
      },
      {
        to: 'user2@example.com',
        subject: '密码重置',
        body: '您请求重置密码，请点击以下链接...'
      },
      {
        to: 'admin@example.com',
        subject: '系统报告',
        body: '今日系统运行报告，请查看附件...'
      }
    ];

    for (const emailData of emailJobs) {
      const job = await this.emailQueue.add('send-email', emailData, {
        priority: emailData.to.includes('admin') ? 10 : 5,
      });
      console.log(`📧 邮件任务已添加: ${job.id}`);
    }
  }

  // 添加图片处理任务
  async addImageProcessingJobs() {
    console.log('\n=== 添加图片处理任务 ===');
    
    const imageJobs = [
      {
        imageUrl: 'https://example.com/image1.jpg',
        operations: ['resize', 'watermark'],
        outputFormat: 'webp'
      },
      {
        imageUrl: 'https://example.com/image2.png',
        operations: ['crop', 'compress'],
        outputFormat: 'jpg'
      },
      {
        imageUrl: 'https://example.com/image3.gif',
        operations: ['convert', 'optimize'],
        outputFormat: 'mp4'
      }
    ];

    for (const imageData of imageJobs) {
      const job = await this.imageQueue.add('process-image', imageData, {
        delay: Math.random() * 2000, // 随机延迟
      });
      console.log(`🖼️  图片处理任务已添加: ${job.id}`);
    }
  }

  // 添加报告生成任务
  async addReportJobs() {
    console.log('\n=== 添加报告生成任务 ===');
    
    const reportJobs = [
      {
        userId: 'user123',
        reportType: 'daily' as const,
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-01'
        }
      },
      {
        userId: 'user456',
        reportType: 'weekly' as const,
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-07'
        }
      },
      {
        userId: 'user789',
        reportType: 'monthly' as const,
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-31'
        }
      }
    ];

    for (const reportData of reportJobs) {
      const job = await this.reportQueue.add('generate-report', reportData, {
        priority: reportData.reportType === 'monthly' ? 8 : 5,
      });
      console.log(`📊 报告生成任务已添加: ${job.id}`);
    }
  }

  // 获取队列状态
  async getQueueStats() {
    console.log('\n=== 队列状态 ===');
    
    const queues = [
      { name: 'Email', queue: this.emailQueue },
      { name: 'Image', queue: this.imageQueue },
      { name: 'Report', queue: this.reportQueue }
    ];

    for (const { name, queue } of queues) {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();
      
      console.log(`${name} 队列:`);
      console.log(`  等待中: ${waiting.length}`);
      console.log(`  处理中: ${active.length}`);
      console.log(`  已完成: ${completed.length}`);
      console.log(`  已失败: ${failed.length}`);
    }
  }

  // 运行示例
  async runExample() {
    try {
      console.log('🚀 启动 BullMQ 示例');
      
      // 创建工作者
      this.createWorkers();
      
      // 添加任务
      await this.addEmailJobs();
      await this.addImageProcessingJobs();
      await this.addReportJobs();
      
      // 等待一段时间让任务处理
      console.log('\n⏳ 等待任务处理...');
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // 显示队列状态
      await this.getQueueStats();
      
      console.log('\n✅ BullMQ 示例完成');
    } catch (error) {
      console.error('❌ BullMQ 示例错误:', error);
    }
  }

  // 清理资源
  async cleanup() {
    console.log('\n🧹 清理资源...');
    
    // 关闭工作者
    for (const worker of this.workers) {
      await worker.close();
    }
    
    // 清空队列
    await this.emailQueue.obliterate({ force: true });
    await this.imageQueue.obliterate({ force: true });
    await this.reportQueue.obliterate({ force: true });
    
    // 关闭队列连接
    await this.emailQueue.close();
    await this.imageQueue.close();
    await this.reportQueue.close();
    
    console.log('✅ 资源清理完成');
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  const example = new BullMQExample();
  
  example.runExample()
    .then(() => example.cleanup())
    .catch(console.error);
}