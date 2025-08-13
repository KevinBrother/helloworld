import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CrawlersModule } from './crawlers/crawlers.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CrawlersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}