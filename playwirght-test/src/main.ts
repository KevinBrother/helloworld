import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WebsiteCrawlerService } from './crawlers/website-crawler.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 等待应用程序完全初始化（包括所有 onModuleInit 钩子）
  await app.init();
  
  // 获取爬虫服务实例
  const crawlerService = app.get<WebsiteCrawlerService>(WebsiteCrawlerService);
  
  // 示例：爬取指定网站并保存到知识库
  const targetUrl = 'https://www.example.com/'; // 替换为目标URL
  await crawlerService.startCrawling(targetUrl, {
    maxDepth: 3,           // 最大爬取深度
    maxPages: 50,          // 最大爬取页面数量
    delay: 1500,           // 每个请求之间的延迟(毫秒)
    takeScreenshots: true  // 启用截图功能
  });
  
  await app.close();
}

bootstrap();
