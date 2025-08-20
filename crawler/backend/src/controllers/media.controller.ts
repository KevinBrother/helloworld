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
  ApiResponse as SwaggerApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { StorageService } from '../core/storage/storage.service';
import { MediaStorageService } from '../services/media/media-storage.service';
import { MediaFileInfo, ApiResponse } from '../shared/interfaces/crawler.interface';

@ApiTags('media')
@Controller('api/media')
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly mediaStorageService: MediaStorageService,
  ) {}

  /**
   * 获取会话的媒体文件
   */
  @ApiOperation({ summary: '获取会话媒体文件', description: '根据会话ID获取媒体文件列表' })
  @ApiParam({ name: 'sessionId', description: '会话ID' })
  @ApiQuery({ name: 'type', required: false, description: '媒体类型过滤' })
  @ApiQuery({ name: 'extension', required: false, description: '文件扩展名过滤' })
  @SwaggerApiResponse({ status: 200, description: '返回媒体文件列表' })
  @Get('session/:sessionId')
  async getSessionMediaFiles(
    @Param('sessionId') sessionId: string,
    @Query('type') type?: string,
    @Query('extension') extension?: string,
  ): Promise<{ files: MediaFileInfo[]; total: number }> {
    try {
      let files: MediaFileInfo[];
      
      if (type && ['image', 'video', 'audio', 'document', 'archive'].includes(type)) {
          files = await this.mediaStorageService.getMediaFilesByType(sessionId, type as 'image' | 'video' | 'audio' | 'document' | 'archive');
        } else if (extension) {
          files = await this.mediaStorageService.getMediaFilesByExtension(sessionId, extension);
        } else {
          files = await this.mediaStorageService.getSessionMediaFiles(sessionId);
        }
      
      return {
        files,
        total: files.length,
      };
    } catch (error) {
      this.logger.error(`获取会话媒体文件失败: ${error.message}`);
      throw new BadRequestException(`获取会话媒体文件失败: ${error.message}`);
    }
  }

  /**
   * 获取所有会话的媒体文件统计
   */
  @ApiOperation({ summary: '获取媒体文件统计', description: '获取所有会话的媒体文件统计信息' })
  @SwaggerApiResponse({ status: 200, description: '返回媒体文件统计信息' })
  @Get('stats')
  async getAllMediaStats(): Promise<{
     totalFiles: number;
     totalSessions: number;
     filesByType: Record<string, number>;
     filesBySession: Record<string, number>;
   }> {
    try {
      return await this.mediaStorageService.getAllMediaFilesStats();
    } catch (error) {
      this.logger.error(`获取媒体文件统计失败: ${error.message}`);
      throw new BadRequestException(`获取媒体文件统计失败: ${error.message}`);
    }
  }

  /**
   * 搜索媒体文件
   */
  @ApiOperation({ summary: '搜索媒体文件', description: '根据关键词搜索媒体文件' })
  @ApiQuery({ name: 'query', description: '搜索关键词' })
  @ApiQuery({ name: 'sessionId', required: false, description: '会话ID过滤' })
  @ApiQuery({ name: 'type', required: false, description: '媒体类型过滤' })
  @SwaggerApiResponse({ status: 200, description: '返回搜索结果' })
  @Get('search')
  async searchMediaFiles(
    @Query('query') query: string,
    @Query('sessionId') sessionId?: string,
    @Query('type') type?: string,
  ): Promise<{ files: MediaFileInfo[]; total: number }> {
    if (!query) {
      throw new BadRequestException('搜索关键词不能为空');
    }
    
    try {
      const files = this.mediaStorageService.searchMediaFiles(sessionId, {
          fileName: query,
          sourceUrl: query,
          type: type
        });
      
      return {
        files,
        total: files.length,
      };
    } catch (error) {
      this.logger.error(`搜索媒体文件失败: ${error.message}`);
      throw new BadRequestException(`搜索媒体文件失败: ${error.message}`);
    }
  }

  /**
   * 获取媒体文件下载链接
   */
  @ApiOperation({ summary: '获取媒体文件下载链接', description: '生成媒体文件的下载链接' })
  @ApiParam({ name: 'sessionId', description: '会话ID' })
  @ApiParam({ name: 'fileName', description: '文件名' })
  @SwaggerApiResponse({ status: 200, description: '返回下载链接' })
  @Get(':sessionId/:fileName/download')
  async getMediaFileDownloadUrl(
    @Param('sessionId') sessionId: string,
    @Param('fileName') fileName: string
  ): Promise<{ downloadUrl: string }> {
    try {
      // 检查文件是否存在
      const mediaFile = this.mediaStorageService.getMediaFile(sessionId, fileName);
      
      if (!mediaFile || !mediaFile.storagePath) {
        throw new BadRequestException('文件不存在或无法生成下载链接');
      }
      
      // 返回通过后端代理的下载链接
      const downloadUrl = `http://localhost:3000/api/media/${sessionId}/${encodeURIComponent(fileName)}/stream`;
      
      return {
        downloadUrl,
      };
    } catch (error) {
      this.logger.error(`获取媒体文件下载链接失败: ${error.message}`);
      throw new BadRequestException(`获取媒体文件下载链接失败: ${error.message}`);
    }
  }

  /**
   * 直接流式传输媒体文件内容
   */
  @ApiOperation({ summary: '流式传输媒体文件', description: '直接流式传输媒体文件内容' })
  @ApiParam({ name: 'sessionId', description: '会话ID' })
  @ApiParam({ name: 'fileName', description: '文件名' })
  @SwaggerApiResponse({ status: 200, description: '返回媒体文件流' })
  @Get(':sessionId/:fileName/stream')
  async streamMediaFile(
    @Param('sessionId') sessionId: string,
    @Param('fileName') fileName: string,
    @Res() res: any
  ): Promise<void> {
    try {
      // 获取媒体文件信息
      const mediaFile = this.mediaStorageService.getMediaFile(sessionId, fileName);
      
      if (!mediaFile || !mediaFile.storagePath) {
        res.status(404).json({ error: '文件不存在' });
        return;
      }
      
      const client = await this.storageService.getClient();
      const bucketName = this.storageService.getBucketName();
      
      // 获取文件对象
      const dataStream = await client.getObject(bucketName, mediaFile.storagePath);
      
      // 获取文件信息以设置正确的Content-Type
      const stat = await client.statObject(bucketName, mediaFile.storagePath);
      
      // 设置响应头
      res.setHeader('Content-Type', stat.metaData['content-type'] || 'application/octet-stream');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // 流式传输文件
      dataStream.pipe(res);
      
      this.logger.log(`流式传输媒体文件: ${sessionId}/${fileName}`);
    } catch (error) {
      this.logger.error(`流式传输媒体文件失败: ${error.message}`);
      res.status(404).json({ error: `文件不存在或无法访问: ${error.message}` });
    }
  }
}