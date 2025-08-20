import { Injectable, Logger } from '@nestjs/common';
import { CrawlerService } from '../crawler.service';
import { DataQualityService, QualityCheckResult } from './data-quality.service';
import { DataStorageService } from '../../data/services/data-storage.service';
import { CrawlRequestDto } from '../dto/crawl-request.dto';
import { ExtractedData } from '../dto/crawl-result.dto';

export interface BatchCrawlRequest {
  urls: string[];
  config: Omit<CrawlRequestDto, 'url'>;
  options?: BatchCrawlOptions;
}

export interface BatchCrawlOptions {
  concurrency?: number; // 并发数
  delay?: number; // 请求间隔（毫秒）
  retries?: number; // 重试次数
  continueOnError?: boolean; // 遇到错误是否继续
  qualityThreshold?: number; // 数据质量阈值
  enableDeduplication?: boolean; // 启用去重
  batchSize?: number; // 批量存储大小
}

export interface BatchCrawlResult {
  totalUrls: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  results: Array<{
    url: string;
    success: boolean;
    data?: ExtractedData;
    error?: string;
    qualityScore?: number;
    executionTime: number;
  }>;
  summary: {
    averageQualityScore: number;
    averageExecutionTime: number;
    commonErrors: { error: string; count: number }[];
    qualityReport: any;
  };
  startTime: Date;
  endTime: Date;
  totalTime: number;
}

@Injectable()
export class BatchCrawlerService {
  private readonly logger = new Logger(BatchCrawlerService.name);
  private readonly crawledUrls = new Set<string>(); // 用于去重

  constructor(
    private readonly crawlerService: CrawlerService,
    private readonly dataQuality: DataQualityService,
    private readonly dataStorage: DataStorageService,
  ) {}

  /**
   * 批量爬取URL
   */
  async batchCrawl(request: BatchCrawlRequest): Promise<BatchCrawlResult> {
    const startTime = new Date();
    const options = this.getDefaultOptions(request.options);
    
    this.logger.log(`开始批量爬取，共 ${request.urls.length} 个URL`, {
      concurrency: options.concurrency,
      qualityThreshold: options.qualityThreshold,
    });

    const results: BatchCrawlResult['results'] = [];
    const qualityResults: QualityCheckResult[] = [];
    const errors = new Map<string, number>();
    
    // 去重处理
    let urlsToProcess = request.urls;
    if (options.enableDeduplication) {
      urlsToProcess = this.deduplicateUrls(request.urls);
      this.logger.log(`去重后剩余 ${urlsToProcess.length} 个URL`);
    }

    // 分批处理
    const batches = this.chunkArray(urlsToProcess, options.concurrency!);
    let processedCount = 0;
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    for (const batch of batches) {
      const batchPromises = batch.map(async (url) => {
        const urlStartTime = Date.now();
        
        try {
          // 构建爬取请求
          const crawlRequest: CrawlRequestDto = {
            ...request.config,
            url,
          };

          // 执行爬取
          const crawlResult = await this.crawlerService.crawl(crawlRequest);
          
          if (!crawlResult.success || !crawlResult.data) {
            failureCount++;
            const error = crawlResult.error || '爬取失败';
            errors.set(error, (errors.get(error) || 0) + 1);
            
            return {
              url,
              success: false,
              error,
              executionTime: Date.now() - urlStartTime,
            };
          }

          // 数据质量检查
          const qualityResult = this.dataQuality.checkQuality(crawlResult.data);
          qualityResults.push(qualityResult);

          // 检查质量阈值
          if (qualityResult.score < options.qualityThreshold!) {
            skippedCount++;
            this.logger.warn(`数据质量不达标，跳过: ${url}`, {
              score: qualityResult.score,
              threshold: options.qualityThreshold,
            });
            
            return {
              url,
              success: false,
              error: `数据质量不达标 (${qualityResult.score}/${options.qualityThreshold})`,
              qualityScore: qualityResult.score,
              executionTime: Date.now() - urlStartTime,
            };
          }

          successCount++;
          return {
            url,
            success: true,
            data: crawlResult.data,
            qualityScore: qualityResult.score,
            executionTime: Date.now() - urlStartTime,
          };

        } catch (error) {
          failureCount++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.set(errorMessage, (errors.get(errorMessage) || 0) + 1);
          
          this.logger.error(`爬取失败: ${url}`, error);
          
          return {
            url,
            success: false,
            error: errorMessage,
            executionTime: Date.now() - urlStartTime,
          };
        }
      });

      // 等待当前批次完成
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      processedCount += batch.length;
      this.logger.log(`批次完成: ${processedCount}/${urlsToProcess.length}`, {
        success: successCount,
        failure: failureCount,
        skipped: skippedCount,
      });

      // 批次间延迟
      if (options.delay && processedCount < urlsToProcess.length) {
        await this.sleep(options.delay);
      }
    }

    // 批量存储成功的数据
    const successfulData = results
      .filter(r => r.success && r.data)
      .map(r => r.data!);
    
    if (successfulData.length > 0) {
      try {
        await this.batchStoreData(successfulData, options.batchSize!);
        this.logger.log(`批量存储完成: ${successfulData.length} 条记录`);
      } catch (storageError) {
        this.logger.error('批量存储失败', storageError);
      }
    }

    const endTime = new Date();
    const totalTime = endTime.getTime() - startTime.getTime();

    // 生成质量报告
    const qualityReport = qualityResults.length > 0 
      ? this.dataQuality.generateQualityReport(qualityResults)
      : null;

    // 计算统计信息
    const averageQualityScore = qualityResults.length > 0
      ? qualityResults.reduce((sum, r) => sum + r.score, 0) / qualityResults.length
      : 0;
    
    const averageExecutionTime = results.length > 0
      ? results.reduce((sum, r) => sum + r.executionTime, 0) / results.length
      : 0;

    const commonErrors = Array.from(errors.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const result: BatchCrawlResult = {
      totalUrls: request.urls.length,
      successCount,
      failureCount,
      skippedCount,
      results,
      summary: {
        averageQualityScore: Math.round(averageQualityScore * 100) / 100,
        averageExecutionTime: Math.round(averageExecutionTime),
        commonErrors,
        qualityReport,
      },
      startTime,
      endTime,
      totalTime,
    };

    this.logger.log('批量爬取完成', {
      total: result.totalUrls,
      success: result.successCount,
      failure: result.failureCount,
      skipped: result.skippedCount,
      totalTime: result.totalTime,
      averageQualityScore: result.summary.averageQualityScore,
    });

    return result;
  }

  /**
   * 获取默认选项
   */
  private getDefaultOptions(options?: BatchCrawlOptions): Required<BatchCrawlOptions> {
    return {
      concurrency: 5,
      delay: 1000,
      retries: 3,
      continueOnError: true,
      qualityThreshold: 60,
      enableDeduplication: true,
      batchSize: 100,
      ...options,
    };
  }

  /**
   * URL去重
   */
  private deduplicateUrls(urls: string[]): string[] {
    const uniqueUrls = new Set<string>();
    const result: string[] = [];
    
    for (const url of urls) {
      const normalizedUrl = this.normalizeUrl(url);
      if (!uniqueUrls.has(normalizedUrl) && !this.crawledUrls.has(normalizedUrl)) {
        uniqueUrls.add(normalizedUrl);
        this.crawledUrls.add(normalizedUrl);
        result.push(url);
      }
    }
    
    return result;
  }

  /**
   * 标准化URL
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // 移除fragment和一些查询参数
      urlObj.hash = '';
      // 可以根据需要移除特定的查询参数
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 批量存储数据
   */
  private async batchStoreData(dataList: ExtractedData[], batchSize: number): Promise<void> {
    const batches = this.chunkArray(dataList, batchSize);
    
    for (const batch of batches) {
      try {
        await this.dataStorage.storeBatchData(batch, {
          database: 'crawler',
          collection: 'crawled_data',
          indexFields: ['url', 'title', 'crawledAt'],
        });
      } catch (error) {
        this.logger.error(`批量存储失败，批次大小: ${batch.length}`, error);
        throw error;
      }
    }
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清除已爬取URL缓存
   */
  clearCrawledUrls(): void {
    this.crawledUrls.clear();
    this.logger.log('已清除爬取URL缓存');
  }

  /**
   * 获取已爬取URL数量
   */
  getCrawledUrlsCount(): number {
    return this.crawledUrls.size;
  }

  /**
   * 检查URL是否已爬取
   */
  isUrlCrawled(url: string): boolean {
    return this.crawledUrls.has(this.normalizeUrl(url));
  }
}