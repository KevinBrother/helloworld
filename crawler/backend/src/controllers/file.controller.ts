import {
  Controller,
  Get,
  Param,
  Query,
  Logger,
  BadRequestException,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { StorageService } from '../core/storage/storage.service';
import { METADATA_KEYS_RETRIEVAL } from '../shared/constants/metadata.constants';

@ApiTags('files')
@Controller('api/files')
export class FileController {
  private readonly logger = new Logger(FileController.name);

  constructor(
    private readonly storageService: StorageService,
  ) {}

  /**
   * 流式查询MinIO中的文件 (Server-Sent Events)
   */
  @ApiOperation({ summary: '流式查询文件', description: '使用Server-Sent Events流式返回文件列表' })
  @ApiQuery({ name: 'prefix', required: false, description: '文件前缀过滤' })
  @ApiQuery({ name: 'sessionId', required: false, description: '会话ID过滤' })
  @ApiQuery({ name: 'maxKeys', required: false, description: '最大返回数量', type: Number })
  @ApiQuery({ name: 'batchSize', required: false, description: '批次大小', type: Number })
  @ApiResponse({ status: 200, description: '返回SSE流' })
  @Get('stream')
  async streamFiles(
    @Res() res: any,
    @Query('prefix') prefix?: string,
    @Query('sessionId') sessionId?: string,
    @Query('maxKeys') maxKeys: number = 500,
    @Query('batchSize') batchSize: number = 20,
  ): Promise<void> {
    try {
      const client = await this.storageService.getClient();
      const bucketName = this.storageService.getBucketName();
      
      let searchPrefix = '';
      if (sessionId) {
        searchPrefix = `sessions/${sessionId}/`;
      } else if (prefix) {
        searchPrefix = prefix;
      }
      
      // 设置SSE响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
      
      // 发送初始连接确认
      res.write(`data: ${JSON.stringify({ type: 'connected', message: '开始流式加载文件列表' })}\n\n`);
      
      const stream = client.listObjects(bucketName, searchPrefix, true);
      let batch: any[] = [];
      let totalCount = 0;
      let processedCount = 0;
      
      // 用于控制并发处理的队列
      const processingQueue: any[] = [];
      const concurrency = Math.min(10, batchSize);
      let isProcessing = false;
      
      const processObject = async (obj: any) => {
        isProcessing = true;
        try {
          // 尝试从文件路径中提取溯源信息
          const traceabilityInfo = await this.extractTraceabilityInfo(obj.name);
          
          const fileInfo = {
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
            etag: obj.etag,
            // 添加溯源信息
            originalUrl: traceabilityInfo?.originalUrl || null,
            sourcePageUrl: traceabilityInfo?.sourcePageUrl || null,
            traceability: traceabilityInfo
          };
          
          batch.push(fileInfo);
          processedCount++;
          
          // 当批次达到指定大小时发送数据
          if (batch.length >= batchSize) {
            res.write(`data: ${JSON.stringify({ 
              type: 'batch', 
              files: [...batch], 
              processed: processedCount,
              batchNumber: Math.ceil(processedCount / batchSize)
            })}\n\n`);
            batch = [];
          }
          
          // 模拟处理延迟，避免过快发送
          await new Promise(resolve => setTimeout(resolve, 1));
        } catch (err) {
          this.logger.error(`处理文件对象失败: ${err.message}`);
        } finally {
          // 处理完成后，检查队列是否有等待的对象
          if (processingQueue.length > 0) {
            const nextObj = processingQueue.shift();
            processObject(nextObj);
          } else {
            isProcessing = false;
            if (stream.readable) {
              stream.resume();
            }
          }
        }
      };
      
      stream.on('data', (obj) => {
        totalCount++;
        
        // 如果达到maxKeys限制，停止处理
        if (totalCount > maxKeys) {
          stream.destroy();
          return;
        }
        
        // 当处理队列未满时，直接处理对象
        if (processingQueue.length < concurrency && !isProcessing) {
          processObject(obj);
        } else {
          // 队列已满，先暂停流，避免数据堆积
          stream.pause();
          processingQueue.push(obj);
        }
      });
      
      stream.on('end', () => {
        // 发送剩余的批次数据
        if (batch.length > 0) {
          res.write(`data: ${JSON.stringify({ 
            type: 'batch', 
            files: batch, 
            processed: processedCount,
            batchNumber: Math.ceil(processedCount / batchSize)
          })}\n\n`);
        }
        
        // 发送完成信号
        res.write(`data: ${JSON.stringify({ 
          type: 'completed', 
          total: processedCount,
          message: `流式加载完成，共处理 ${processedCount} 个文件`
        })}\n\n`);
        
        res.end();
        this.logger.log(`流式文件查询完成，共处理 ${processedCount} 个文件，前缀: ${searchPrefix}`);
      });
      
      stream.on('error', (error) => {
        this.logger.error(`流式查询文件失败: ${error.message}`);
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          message: `查询失败: ${error.message}`
        })}\n\n`);
        res.end();
      });
      
      // 处理客户端断开连接
      res.on('close', () => {
        this.logger.log('客户端断开SSE连接');
        if (stream.readable) {
          stream.destroy();
        }
      });
      
    } catch (error) {
      this.logger.error(`启动流式查询失败: ${error.message}`);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: `启动查询失败: ${error.message}`
      })}\n\n`);
      res.end();
    }
  }

  /**
   * 查询MinIO中的文件 (传统分页方式)
   */
  @Get()
  async listFiles(
    @Query('prefix') prefix?: string,
    @Query('sessionId') sessionId?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('maxKeys') maxKeys: number = 1000,
  ): Promise<{ files: any[]; total: number; page: number; totalPages: number; hasMore: boolean }> {
    try {
      const client = await this.storageService.getClient();
      const bucketName = this.storageService.getBucketName();
      
      let searchPrefix = '';
      if (sessionId) {
        searchPrefix = `sessions/${sessionId}/`;
      } else if (prefix) {
        searchPrefix = prefix;
      }
      
      // 确保分页参数有效
      const pageNum = Math.max(1, Number(page) || 1);
      const pageSize = Math.min(Math.max(1, Number(limit) || 50), 200); // 最大限制200
      const skip = (pageNum - 1) * pageSize;
      
      const allFiles: any[] = [];
      
      return new Promise((resolve, reject) => {
        const stream = client.listObjects(bucketName, searchPrefix, true);
        let objectCount = 0;
        let isStreamPaused = false;
        
        // 流控制：当文件数量超过maxKeys时暂停流
        const checkAndPauseStream = () => {
          if (objectCount >= maxKeys && !isStreamPaused) {
            stream.pause();
            isStreamPaused = true;
            this.logger.log(`达到maxKeys限制(${maxKeys})，暂停流处理`);
          }
        };
        
        stream.on('data', (obj) => {
          objectCount++;
          
          // 检查是否超过maxKeys限制
          if (objectCount > maxKeys) {
            return; // 忽略超出限制的对象
          }
          
          allFiles.push({
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
            etag: obj.etag,
          });
          
          // 每处理100个文件检查一次是否需要暂停
          if (objectCount % 100 === 0) {
            checkAndPauseStream();
          }
        });
        
        stream.on('end', () => {
          // 按修改时间倒序排序
          allFiles.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
          
          const total = allFiles.length;
          const totalPages = Math.ceil(total / pageSize);
          const files = allFiles.slice(skip, skip + pageSize);
          
          // 如果实际文件数达到maxKeys，说明可能还有更多文件
          const actualHasMore = pageNum < totalPages || (objectCount >= maxKeys);
          
          this.logger.log(`查询到 ${total} 个文件，处理了 ${objectCount} 个对象，返回第 ${pageNum} 页，共 ${files.length} 个文件，前缀: ${searchPrefix}`);
          
          resolve({ 
            files, 
            total, 
            page: pageNum, 
            totalPages, 
            hasMore: actualHasMore 
          });
        });
        
        stream.on('error', (error) => {
          this.logger.error(`查询文件失败: ${error.message}`);
          reject(new BadRequestException(`查询文件失败: ${error.message}`));
        });
      });
    } catch (error) {
      this.logger.error(`查询文件失败: ${error.message}`);
      throw new BadRequestException(`查询文件失败: ${error.message}`);
    }
  }

  /**
   * 获取文件下载链接
   */
  @ApiOperation({ summary: '获取文件下载链接', description: '生成文件的下载链接' })
  @ApiParam({ name: 'fileName', description: '文件名' })
  @ApiResponse({ status: 200, description: '返回下载链接' })
  @Get(':fileName/download')
  async getFileDownloadUrl(@Param('fileName') fileName: string): Promise<{ downloadUrl: string }> {
    try {
      // 返回通过后端代理的下载链接，而不是直接的MinIO预签名URL
      const downloadUrl = `http://localhost:3000/api/files/${encodeURIComponent(fileName)}/stream`;
      
      this.logger.log(`生成文件下载链接: ${fileName}`);
      return { downloadUrl };
    } catch (error) {
      this.logger.error(`生成下载链接失败: ${error.message}`);
      throw new BadRequestException(`生成下载链接失败: ${error.message}`);
    }
  }

  /**
   * 直接流式传输文件内容
   */
  @ApiOperation({ summary: '流式传输文件', description: '直接流式传输文件内容' })
  @ApiParam({ name: 'fileName', description: '文件名' })
  @ApiResponse({ status: 200, description: '返回文件流' })
  @Get(':fileName/stream')
  async streamFile(@Param('fileName') fileName: string, @Res() res: any): Promise<void> {
    try {
      const client = await this.storageService.getClient();
      const bucketName = this.storageService.getBucketName();
      
      // 获取文件对象
      const dataStream = await client.getObject(bucketName, fileName);
      
      // 获取文件信息以设置正确的Content-Type
      const stat = await client.statObject(bucketName, fileName);
      
      // 设置响应头
      res.setHeader('Content-Type', stat.metaData['content-type'] || 'application/octet-stream');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName.split('/').pop()}"`);
      
      // 流式传输文件
      dataStream.pipe(res);
      
      this.logger.log(`流式传输文件: ${fileName}`);
    } catch (error) {
      this.logger.error(`流式传输文件失败: ${error.message}`);
      res.status(404).json({ error: `文件不存在或无法访问: ${error.message}` });
    }
  }

  /**
   * 从文件路径中提取溯源信息
   */
  private async extractTraceabilityInfo(filePath: string): Promise<any> {
    try {
      // 优先从MinIO对象metadata中读取溯源信息
      const traceabilityFromMetadata = await this.getTraceabilityFromMetadata(filePath);
      if (traceabilityFromMetadata) {
        return traceabilityFromMetadata;
      }
      
      // 后备方案：从文件路径解析溯源信息
      return this.parseTraceabilityFromPath(filePath);
    } catch (error) {
      this.logger.warn(`提取溯源信息失败: ${error.message}`);
      return null;
    }
  }
  
  /**
   * 从MinIO对象metadata中获取溯源信息
   */
  private async getTraceabilityFromMetadata(filePath: string): Promise<any> {
    try {
      const client = await this.storageService.getClient();
      const bucketName = this.storageService.getBucketName();
      
      const objectStat = await client.statObject(bucketName, filePath);
      const metadata = objectStat.metaData;
      
      // 统一使用小写key读取metadata
      const originalUrl = metadata[METADATA_KEYS_RETRIEVAL.ORIGINAL_URL];
      const sourcePageUrl = metadata[METADATA_KEYS_RETRIEVAL.SOURCE_URL];
      
      if (originalUrl) {
        const { domain, type } = this.extractPathInfo(filePath);
        
        return {
          originalUrl, // 原始资源URL
          sourcePageUrl: sourcePageUrl || originalUrl, // 来源页面URL
          domain,
          type
        };
      }
      
      return null;
    } catch (error) {
      this.logger.debug(`读取对象metadata失败: ${error.message}`);
      return null;
    }
  }
  
  /**
   * 从文件路径解析溯源信息（后备方案）
   */
  private parseTraceabilityFromPath(filePath: string): any {
    const pathParts = filePath.split('/');
    if (pathParts.length < 6 || pathParts[0] !== 'domain') {
      return null;
    }
    
    const domain = pathParts[1];
    const type = pathParts[5];
    
    if (type === 'pages') {
      const urlPath = pathParts.slice(6, -1).join('/');
      const originalUrl = urlPath === '_root' ? `https://${domain}/` : `https://${domain}/${urlPath}`;
      
      return {
        originalUrl,
        sourcePageUrl: originalUrl, // 页面的原始URL和来源URL相同
        domain,
        type: 'page'
      };
    }
    
    if (type === 'media' && pathParts.length >= 8) {
      const fileName = pathParts[7];
      const originalFileName = fileName.includes('_') ? fileName.split('_').slice(1).join('_') : fileName;
      
      return {
        originalUrl: `https://${domain}/${originalFileName}`, // 媒体文件的原始URL
        sourcePageUrl: `https://${domain}/`, // 媒体文件的来源页面URL（默认为域名根路径）
        domain,
        type: 'media',
        fileName: originalFileName
      };
    }
    
    return null;
  }
  
  /**
   * 从文件路径提取基本信息
   */
  private extractPathInfo(filePath: string): { domain: string; type: string } {
    const pathParts = filePath.split('/');
    const domain = pathParts.length >= 2 && pathParts[0] === 'domain' ? pathParts[1] : 'unknown';
    const type = pathParts.includes('media') ? 'media' : 'page';
    
    return { domain, type };
  }
}