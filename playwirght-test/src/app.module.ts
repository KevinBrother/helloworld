import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CrawlerModule } from './modules/crawler.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CrawlerModule,
  ],
  controllers: [AppController],
})
export class AppModule {}