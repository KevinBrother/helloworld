import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CrawlersModule } from './crawlers/crawlers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CrawlersModule,
  ],
})
export class AppModule {}