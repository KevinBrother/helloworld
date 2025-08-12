import { Module } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { CrawlerController } from './crawler.controller';
import { BrowserPoolService } from './services/browser-pool.service';
import { PageAnalyzerService } from './services/page-analyzer.service';
import { AntiDetectionService } from './services/anti-detection.service';
import { ApiDiscoveryService } from './services/api-discovery.service';

@Module({
  controllers: [CrawlerController],
  providers: [
    CrawlerService,
    BrowserPoolService,
    PageAnalyzerService,
    AntiDetectionService,
    ApiDiscoveryService,
  ],
  exports: [CrawlerService],
})
export class CrawlerModule {}
