import { Module } from '@nestjs/common';
import { CrawlerController } from '../controllers/crawler.controller';
import { WebsiteCrawlerService } from '../services/crawler/website-crawler.service';
import { LinkManagerService } from '../services/crawler/link-manager.service';
import { ContentExtractorService } from '../services/content/content-extractor.service';
import { BrowserService } from '../core/browser/browser.service';
import { StorageService } from '../core/storage/storage.service';

@Module({
  controllers: [CrawlerController],
  providers: [
    WebsiteCrawlerService,
    LinkManagerService,
    ContentExtractorService,
    BrowserService,
    StorageService,
  ],
  exports: [
    WebsiteCrawlerService,
    LinkManagerService,
    ContentExtractorService,
    BrowserService,
    StorageService,
  ],
})
export class CrawlerModule {}