import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // 配置静态文件服务
  app.useStaticAssets(join(__dirname, '..', '..', 'static'), {
    index: false
  });
  
  // 等待应用程序完全初始化（包括所有 onModuleInit 钩子）
  await app.init();
  
  // 启动HTTP服务器
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 爬虫服务已启动，监听端口: ${port}`);
  console.log(`📡 API接口: http://localhost:${port}/crawler/crawl`);
  console.log(`📊 MinIO WebUI: http://localhost:9001`);
  console.log(`\n使用示例:`);
  console.log(`curl -X POST http://localhost:${port}/crawler/crawl \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"url": "https://www.example.com", "maxPages": 10, "takeScreenshots": true}'`);
}

bootstrap();
