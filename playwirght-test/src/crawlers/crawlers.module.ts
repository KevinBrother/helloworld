import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebsiteCrawlerService } from './website-crawler.service';
import { PlaywrightService } from './playwright.service';
import { LinkManagerService } from './link-manager.service';
import { ContentExtractorService } from './content-extractor.service';
import { KnowledgeBaseService } from './knowledge-base.service';
import { MinioService } from './minio.service';
import { CrawlerController } from './crawler.controller';

@Global()
@Module({
  imports: [HttpModule],
  controllers: [CrawlerController],
  providers: [
    WebsiteCrawlerService,
    PlaywrightService,
    LinkManagerService,
    ContentExtractorService,
    KnowledgeBaseService,
    MinioService
  ],
  exports: [
    WebsiteCrawlerService,
    PlaywrightService,
    LinkManagerService,
    ContentExtractorService,
    KnowledgeBaseService,
    MinioService
  ]
})
export class CrawlersModule {}
