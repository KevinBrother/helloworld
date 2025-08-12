import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrawlerService } from './crawler.service';
import { CrawlerController } from './crawler.controller';
import { CrawlConfigsController } from './crawl-configs.controller';
import { CrawlConfigsService } from './services/crawl-configs.service';
import { BrowserPoolService } from './services/browser-pool.service';
import { PageAnalyzerService } from './services/page-analyzer.service';
import { AntiDetectionService } from './services/anti-detection.service';
import { ApiDiscoveryService } from './services/api-discovery.service';
import { CrawlConfig } from '../../entities/mysql/crawl-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CrawlConfig])],
  controllers: [CrawlerController, CrawlConfigsController],
  providers: [
    CrawlerService,
    CrawlConfigsService,
    BrowserPoolService,
    PageAnalyzerService,
    AntiDetectionService,
    ApiDiscoveryService,
  ],
  exports: [CrawlerService, CrawlConfigsService],
})
export class CrawlerModule {}
