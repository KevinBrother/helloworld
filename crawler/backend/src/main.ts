import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { join } from "path";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 配置静态文件服务
  app.useStaticAssets(join(__dirname, "..", "public"));

  // 配置Swagger文档
  const config = new DocumentBuilder()
    .setTitle('网站爬虫知识库 API')
    .setDescription('网站爬虫和知识库管理系统的API文档')
    .setVersion('1.0')
    .addTag('crawler', '爬虫相关接口')
    .addTag('files', '文件管理接口')
    .addTag('media', '媒体文件接口')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: '爬虫系统 API 文档',
    customfavIcon: '/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  // 等待应用程序完全初始化（包括所有 onModuleInit 钩子）
  await app.init();

  // 启动HTTP服务器
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 爬虫服务已启动，监听端口: ${port}`);
  console.log(`🌐 爬取界面地址: http://localhost:${port}/crawler-test.html`);
  console.log(`🌐 查询界面地址: http://localhost:${port}/minio-test.html`);
  console.log(`📡 API接口: http://localhost:${port}/crawler/crawl`);
  console.log(`📚 API文档: http://localhost:${port}/api-docs`);
  console.log(`📊 MinIO WebUI: http://localhost:9001`);
  console.log(`\n使用示例:`);
  console.log(`curl -X POST http://localhost:${port}/crawler/crawl \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(
    `  -d '{"url": "https://www.example.com", "maxPages": 10, "takeScreenshots": true}'`
  );
}

bootstrap();
