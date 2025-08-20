import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CrawlerController } from './crawler.controller';
import { CrawlerService } from './crawler.service';
import { PageAnalyzerService } from './services/page-analyzer.service';
import { BrowserPoolService } from './services/browser-pool.service';
import { AntiDetectionService } from './services/anti-detection.service';
import { ApiDiscoveryService } from './services/api-discovery.service';
import { DataQualityService } from './services/data-quality.service';
import { BatchCrawlerService } from './services/batch-crawler.service';
import { TaskSchedulerService } from './services/task-scheduler.service';
import { CrawlConfigManagerService } from './services/crawl-config-manager.service';
import { CrawlerMonitorService } from './services/crawler-monitor.service';
import { DataStorageService } from '../data/services/data-storage.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CrawledData,
  CrawledDataSchema,
} from '../../entities/mongodb/crawled-data.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      {
        name: CrawledData.name,
        schema: CrawledDataSchema,
      },
    ]),
  ],
  controllers: [CrawlerController],
  providers: [
    CrawlerService,
    PageAnalyzerService,
    BrowserPoolService,
    AntiDetectionService,
    ApiDiscoveryService,
    DataQualityService,
    BatchCrawlerService,
    TaskSchedulerService,
    CrawlConfigManagerService,
    CrawlerMonitorService,
    DataStorageService,
  ],
  exports: [
    CrawlerService,
    PageAnalyzerService,
    BatchCrawlerService,
    TaskSchedulerService,
    CrawlConfigManagerService,
    CrawlerMonitorService,
  ],
})
export class CrawlerModule {}
