import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExtractedData } from '../../crawler/dto/crawl-result.dto';
import {
  CrawledData,
  CrawledDataDocument,
} from '../../../entities/mongodb/crawled-data.schema';

export interface StorageOptions {
  database?: string;
  collection?: string;
  indexFields?: string[];
  ttl?: number; // 数据生存时间（秒）
  compression?: boolean;
}

export interface StorageResult {
  success: boolean;
  recordId?: string;
  error?: string;
  insertedCount?: number;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

export interface QueryResult {
  data: ExtractedData[];
  total: number;
  hasMore: boolean;
}

@Injectable()
export class DataStorageService {
  private readonly logger = new Logger(DataStorageService.name);

  constructor(
    @InjectModel(CrawledData.name)
    private readonly crawledDataModel: Model<CrawledDataDocument>,
  ) {}

  /**
   * 存储单条数据
   */
  async storeData(
    data: ExtractedData,
    options: StorageOptions = {},
  ): Promise<StorageResult> {
    try {
      this.logger.log('存储单条数据');

      // 数据预处理
      const processedData = this.preprocessData(data);

      // 生成记录ID
      const recordId = this.generateRecordId(processedData);

      // 模拟数据库存储
      await this.saveToDatabase(processedData, recordId, options);

      this.logger.log(`数据存储成功，记录ID: ${recordId}`);

      return {
        success: true,
        recordId,
        insertedCount: 1,
      };
    } catch (error) {
      this.logger.error('数据存储失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 批量存储数据
   */
  async storeBatchData(
    dataList: ExtractedData[],
    options: StorageOptions = {},
  ): Promise<StorageResult> {
    try {
      this.logger.log(`开始批量存储数据，记录数: ${dataList.length}`);

      const processedDataList = dataList.map((data) =>
        this.preprocessData(data),
      );

      // 批量保存到数据库
      const insertedCount = await this.saveBatchToDatabase(
        processedDataList,
        options,
      );

      this.logger.log(`批量数据存储完成，成功插入: ${insertedCount} 条`);

      return {
        success: true,
        insertedCount,
      };
    } catch (error) {
      this.logger.error('批量数据存储失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 查询数据
   */
  async queryData(
    options: QueryOptions = {},
  ): Promise<QueryResult> {
    try {
      this.logger.log('查询数据');

      // 模拟数据库查询
      const result = await this.queryFromDatabase(options);

      return result;
    } catch (error) {
      this.logger.error('数据查询失败:', error);
      return {
        data: [],
        total: 0,
        hasMore: false,
      };
    }
  }

  /**
   * 根据ID获取数据
   */
  async getDataById(recordId: string): Promise<ExtractedData | null> {
    try {
      this.logger.log(`根据ID查询数据: ${recordId}`);

      // 模拟数据库查询
      const data = await this.findByIdInDatabase(recordId);

      return data;
    } catch (error) {
      this.logger.error('根据ID查询数据失败:', error);
      return null;
    }
  }

  /**
   * 删除数据
   */
  async deleteData(recordId: string): Promise<boolean> {
    try {
      this.logger.log(`删除数据: ${recordId}`);

      // 模拟数据库删除
      await this.deleteFromDatabase(recordId);

      this.logger.log(`数据删除成功: ${recordId}`);
      return true;
    } catch (error) {
      this.logger.error('数据删除失败:', error);
      return false;
    }
  }

  /**
   * 更新数据
   */
  async updateData(
    recordId: string,
    updateData: Partial<ExtractedData>,
  ): Promise<boolean> {
    try {
      this.logger.log(`更新数据: ${recordId}`);

      const processedData = this.preprocessData(updateData);

      // 模拟数据库更新
      await this.updateInDatabase(recordId, processedData);

      this.logger.log(`数据更新成功: ${recordId}`);
      return true;
    } catch (error) {
      this.logger.error('数据更新失败:', error);
      return false;
    }
  }

  /**
   * 数据预处理
   */
  private preprocessData(data: Partial<ExtractedData>): ExtractedData {
    const processed: ExtractedData = {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 清理空值
    Object.keys(processed).forEach((key) => {
      if (processed[key] === null || processed[key] === undefined) {
        delete processed[key];
      }
    });

    return processed;
  }

  /**
   * 生成记录ID
   */
  private generateRecordId(data: ExtractedData): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const hash = this.simpleHash(JSON.stringify(data));
    return `${timestamp}_${random}_${hash}`;
  }

  /**
   * 简单哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 保存到数据库
   */
  private async saveToDatabase(
    data: ExtractedData,
    recordId: string,
    _options: StorageOptions,
  ): Promise<void> {
    try {
      // 构建完整的爬虫数据对象
      const crawledData = new this.crawledDataModel({
        taskId:
          parseInt(String(data.taskId)) ||
          parseInt(String(recordId)) ||
          Date.now(),
        userId: parseInt(String(data.userId)) || 1,
        url: data.url || '',
        title: data.title || '',
        content: data.content || '',
        
        // 增强的元数据存储
        metadata: {
          description: data.description || data.metadata?.description || '',
          keywords: data.keywords || data.metadata?.keywords || [],
          author: data.author || data.metadata?.author || '',
          publishDate: data.publishDate ? new Date(data.publishDate) : data.metadata?.publishDate,
          language: data.language || data.metadata?.language || 'unknown',
          charset: data.metadata?.charset || 'UTF-8',
          contentType: data.metadata?.contentType || 'text/html',
          statusCode: data.metadata?.statusCode || 200,
          responseTime: data.metadata?.responseTime || 0,
          headers: data.metadata?.headers || {},
          ...data.metadata,
        },
        
        // 图片信息
        images: data.images || [],
        
        // 链接信息
        links: data.links || [],
        
        // 提取的数据
        extractedData: {
          ...data,
          // 结构化数据
          structuredData: data.structuredData || [],
          // Open Graph数据
          openGraph: data.openGraph || {},
          // Twitter Card数据
          twitterCard: data.twitterCard || {},
        },
        
        // 原始数据
        rawData: {
          html: data.rawData?.html || '',
          text: data.rawData?.text || data.content || '',
          json: data.rawData?.json || null,
          ...data.rawData,
        },
        
        // 深度和父URL（用于爬虫链路追踪）
        depth: data.depth || 0,
        parentUrl: data.parentUrl || '',
        
        // 标签和分类
        tags: data.tags || [],
        
        // 爬虫配置信息
        crawlConfig: data.crawlConfig || {},
        
        // 性能数据
        performance: {
          loadTime: data.performance?.loadTime || 0,
          domContentLoaded: data.performance?.domContentLoaded || 0,
          firstPaint: data.performance?.firstPaint || 0,
          firstContentfulPaint: data.performance?.firstContentfulPaint || 0,
          transferSize: data.performance?.transferSize || 0,
          encodedBodySize: data.performance?.encodedBodySize || 0,
          decodedBodySize: data.performance?.decodedBodySize || 0,
          extractionTime: data.extractionTime || 0,
          ...data.performance,
        },
        
        // 错误信息
        errors: data.errors || [],
        
        // 处理状态
        isProcessed: data.isProcessed || false,
        isExported: data.isExported || false,
        
        // 内容哈希（用于去重）
        contentHash: data.contentHash || this.generateContentHash(data.content || ''),
        
        // 爬取时间
        crawledAt: data.crawledAt ? new Date(data.crawledAt) : new Date(),
      });

      await crawledData.save();
      
      this.logger.debug(`数据成功保存到MongoDB: ${recordId}`, {
        database: _options.database || 'default',
        collection: _options.collection || 'crawled_data',
        dataSize: JSON.stringify(crawledData).length,
        hasImages: (data.images || []).length > 0,
        hasLinks: (data.links || []).length > 0,
        hasStructuredData: (data.structuredData || []).length > 0,
      });
    } catch (error) {
      this.logger.error(`保存数据到MongoDB失败: ${recordId}`, error);
      throw error;
    }
  }

  /**
   * 批量保存到数据库
   */
  private async saveBatchToDatabase(
    dataList: ExtractedData[],
    options: StorageOptions,
  ): Promise<number> {
    try {
      const crawledDataList = dataList.map((data) => ({
        taskId: data.taskId || this.generateRecordId(data),
        userId: data.userId || 'system',
        url: data.url || '',
        title: data.title || '',
        content: data.content || '',
        
        // 增强的元数据存储
        metadata: {
          description: data.description || data.metadata?.description || '',
          keywords: data.keywords || data.metadata?.keywords || [],
          author: data.author || data.metadata?.author || '',
          publishDate: data.publishDate ? new Date(data.publishDate) : data.metadata?.publishDate,
          language: data.language || data.metadata?.language || 'unknown',
          charset: data.metadata?.charset || 'UTF-8',
          contentType: data.metadata?.contentType || 'text/html',
          statusCode: data.metadata?.statusCode || 200,
          responseTime: data.metadata?.responseTime || 0,
          headers: data.metadata?.headers || {},
          ...data.metadata,
        },
        
        // 图片和链接信息
        images: data.images || [],
        links: data.links || [],
        
        // 提取的数据
        extractedData: {
          ...data,
          structuredData: data.structuredData || [],
          openGraph: data.openGraph || {},
          twitterCard: data.twitterCard || {},
        },
        
        // 原始数据
        rawData: {
          html: data.rawData?.html || '',
          text: data.rawData?.text || data.content || '',
          json: data.rawData?.json || null,
          ...data.rawData,
        },
        
        // 其他字段
        depth: data.depth || 0,
        parentUrl: data.parentUrl || '',
        tags: data.tags || [],
        crawlConfig: data.crawlConfig || {},
        performance: {
          loadTime: data.performance?.loadTime || 0,
          domContentLoaded: data.performance?.domContentLoaded || 0,
          firstPaint: data.performance?.firstPaint || 0,
          firstContentfulPaint: data.performance?.firstContentfulPaint || 0,
          transferSize: data.performance?.transferSize || 0,
          encodedBodySize: data.performance?.encodedBodySize || 0,
          decodedBodySize: data.performance?.decodedBodySize || 0,
          extractionTime: data.extractionTime || 0,
          ...data.performance,
        },
        errors: data.errors || [],
        isProcessed: data.isProcessed || false,
        isExported: data.isExported || false,
        contentHash: data.contentHash || this.generateContentHash(data.content || ''),
        crawledAt: data.crawledAt ? new Date(data.crawledAt) : new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await this.crawledDataModel.insertMany(crawledDataList);
      
      this.logger.debug(`批量数据成功保存到MongoDB，记录数: ${result.length}`);
      return result.length;
    } catch (error) {
      this.logger.error(`批量保存数据到MongoDB失败`, error);
      throw error;
    }
  }

  /**
   * 从数据库查询
   */
  private async queryFromDatabase(
    options: QueryOptions): Promise<QueryResult> {
    try {
      const limit = options.limit || 10;
      const offset = options.offset || 0;
      const sortBy = options.sortBy || 'createdAt';
      const sortOrder = options.sortOrder === 'asc' ? 1 : -1;

      // 构建查询条件
      const query = options.filters || {};

      // 执行查询
      const [data, total] = await Promise.all([
        this.crawledDataModel
          .find(query)
          .sort({ [sortBy]: sortOrder })
          .skip(offset)
          .limit(limit)
          .exec(),
        this.crawledDataModel.countDocuments(query).exec(),
      ]);

      // 转换为ExtractedData格式
      const extractedData: ExtractedData[] = data.map(
        (doc) => doc.extractedData,
      );

      this.logger.debug(`从MongoDB查询到 ${extractedData.length} 条数据`);

      return {
        data: extractedData,
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      this.logger.error('从MongoDB查询数据失败', error);
      throw error;
    }
  }

  /**
   * 根据ID从数据库查找
   */
  private async findByIdInDatabase(
    recordId: string,
  ): Promise<ExtractedData | null> {
    try {
      const doc = await this.crawledDataModel
        .findOne({ taskId: recordId })
        .exec();
      
      if (!doc) {
        this.logger.debug(`MongoDB中未找到ID为 ${recordId} 的数据`);
        return null;
      }

      this.logger.debug(`从MongoDB成功查找到ID为 ${recordId} 的数据`);
      return doc.extractedData;
    } catch (error) {
      this.logger.error(`从MongoDB根据ID查找数据失败: ${recordId}`, error);
      throw error;
    }
  }

  /**
   * 从数据库删除（模拟）
   */
  private async deleteFromDatabase(recordId: string): Promise<void> {
    // 这里应该实现实际的数据库删除逻辑
    this.logger.debug(`从数据库删除数据: ${recordId}`);

    // 模拟异步操作
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  /**
   * 在数据库中更新（模拟）
   */
  private async updateInDatabase(
    recordId: string,
    updateData: Partial<ExtractedData>,
  ): Promise<void> {
    // 这里应该实现实际的数据库更新逻辑
    this.logger.debug(`在数据库中更新数据: ${recordId}`, updateData);

    // 模拟异步操作
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  /**
   * 生成内容哈希
   */
  private generateContentHash(content: string): string {
    // 简单的哈希算法，实际项目中可以使用更复杂的算法
    let hash = 0;
    if (content.length === 0) return hash.toString();
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<{
    totalRecords: number;
    storageSize: number;
    collections: string[];
  }> {
    try {
      // 从数据库获取实际统计信息
      const totalRecords = await this.crawledDataModel.countDocuments().exec();
      
      // 获取集合统计信息
      const stats = await this.crawledDataModel.db?.db?.stats();
      
      return {
        totalRecords,
        storageSize: stats?.dataSize || 0,
        collections: ['crawled_data'],
      };
    } catch (error) {
      this.logger.error('获取存储统计信息失败', error);
      return {
        totalRecords: 0,
        storageSize: 0,
        collections: ['crawled_data'],
      };
    }
  }
}