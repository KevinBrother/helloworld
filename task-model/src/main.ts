import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { appConfig } from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 获取配置
  const config = appConfig();
  
  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  
  // 启用CORS
  if (config.api.cors.origin) {
    app.enableCors({
      origin: config.api.cors.origin,
      credentials: config.api.cors.credentials,
    });
  }

  // 设置全局路由前缀
  app.setGlobalPrefix(config.app.apiPrefix);
  
  // Swagger文档配置
  const swaggerConfig = new DocumentBuilder()
    .setTitle(config.swagger.title)
    .setDescription(config.swagger.description)
    .setVersion(config.swagger.version)
    .addTag('tasks', '任务管理')
    .addTag('execution-units', '执行单元管理')
    .build();
  
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(config.swagger.path, app, document);
  
  console.log(`📚 Swagger文档地址: http://localhost:${config.app.port}${config.swagger.path}`);
  
  // 启动应用
  await app.listen(config.app.port, '0.0.0.0');
  
  console.log(`🚀 应用启动成功!`);
  console.log(`🌐 服务地址: http://0.0.0.0:${config.app.port}`);
  console.log(`📋 API前缀: ${config.app.apiPrefix}`);
  console.log(`🔧 运行环境: ${config.app.env}`);
}

bootstrap().catch((error) => {
  console.error('应用启动失败:', error);
  process.exit(1);
});