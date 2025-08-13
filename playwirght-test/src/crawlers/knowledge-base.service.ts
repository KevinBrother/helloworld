import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { PageData } from '../interfaces/crawler.interface';
import { MinioService } from './minio.service';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);
  
  constructor(
    private readonly httpService: HttpService,
    private readonly minioService: MinioService,
  ) {}
  
  /**
   * 保存页面数据到知识库
   */
  async savePageData(pageData: PageData): Promise<boolean> {
    // 优先保存到 MinIO
    const minioSaved = await this.minioService.savePageData(pageData);
    
    if (minioSaved) {
      this.logger.log(`页面数据已保存到 MinIO: ${pageData.url}`);
    }
    
    // 如果配置了外部知识库API，也尝试保存到那里
    try {
      const knowledgeBaseUrl = process.env.KNOWLEDGE_BASE_API_URL;
      
      if (!knowledgeBaseUrl) {
        // 如果没有配置外部API，只要 MinIO 保存成功就返回 true
        return minioSaved;
      }
      
      // 准备发送到知识库的数据格式
      const payload = {
        url: pageData.url,
        title: pageData.title,
        content: pageData.content,
        source: 'web-crawler',
        crawledAt: pageData.metadata.crawledAt.toISOString(),
        metadata: pageData.metadata
      };
      
      // 发送数据到知识库
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(knowledgeBaseUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            // 添加认证信息，如果需要
            'Authorization': `Bearer ${process.env.KNOWLEDGE_BASE_API_TOKEN}`
          }
        })
      );
      
      if (response.status >= 200 && response.status < 300) {
        this.logger.log(`页面数据已保存到外部知识库: ${pageData.url}`);
        return true;
      } else {
        this.logger.error(`保存到外部知识库失败，状态码: ${response.status}, URL: ${pageData.url}`);
        // 外部API失败，但如果 MinIO 保存成功，仍然返回 true
        return minioSaved;
      }
    } catch (error) {
      this.logger.error(`保存页面数据到外部知识库时出错: ${error.message}`, error.stack);
      
      // 外部API出错，但如果 MinIO 保存成功，仍然返回 true
      return minioSaved;
    }
  }
  
  /**
   * 重试保存数据到知识库
   */
  private async retrySave(pageData: PageData, retries: number): Promise<boolean> {
    for (let i = 0; i < retries; i++) {
      try {
        this.logger.log(`重试保存页面数据 (${i + 1}/${retries}): ${pageData.url}`);
        
        // 指数退避策略
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        
        return await this.savePageData(pageData);
      } catch (error) {
        this.logger.error(`第 ${i + 1} 次重试失败: ${error.message}`);
        if (i === retries - 1) {
          // 最后一次重试也失败，记录到失败队列
          this.logger.error(`所有重试都失败，URL: ${pageData.url}`);
          // 可以在这里将失败的URL添加到队列，以便后续处理
          return false;
        }
      }
    }
    return false;
  }
}
