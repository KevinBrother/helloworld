import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './services/media.service';
import { MediaProcessingService } from './services/media-processing.service';
import { MinioService } from './services/minio.service';
import { FileDownloadService } from './services/file-download.service';

export interface UploadFileDto {
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface DownloadFileDto {
  url: string;
  filename?: string;
  description?: string;
  tags?: string[];
}

export interface ProcessFileDto {
  fileId: string;
  operation: 'thumbnail' | 'compress' | 'convert';
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  };
}

@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly processingService: MediaProcessingService,
    private readonly minioService: MinioService,
    private readonly downloadService: FileDownloadService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadFileDto,
  ) {
    try {
      if (!file) {
        throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
      }

      const result = await this.mediaService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        {
          description: uploadDto.description,
          tags: uploadDto.tags || [],
          isPublic: uploadDto.isPublic || false,
        },
      );

      return {
        success: true,
        data: result,
        message: 'File uploaded successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('download')
  async downloadFile(@Body() downloadDto: DownloadFileDto) {
    try {
      const result = await this.mediaService.downloadFile(
        downloadDto.url,
        {
          filename: downloadDto.filename,
          description: downloadDto.description,
          tags: downloadDto.tags || [],
        },
      );

      return {
        success: true,
        data: result,
        message: 'File downloaded successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('files')
  async getFiles(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: string,
    @Query('tags') tags?: string,
  ) {
    try {
      const tagArray = tags ? tags.split(',') : undefined;
      const files = await this.mediaService.getFiles({
        page: Number(page),
        limit: Number(limit),
        type,
        tags: tagArray,
      });

      return {
        success: true,
        data: files,
        message: 'Files retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('files/:id')
  async getFile(@Param('id') id: string) {
    try {
      const file = await this.mediaService.getFileById(id);
      if (!file) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: file,
        message: 'File retrieved successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to get file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('files/:id')
  async deleteFile(@Param('id') id: string) {
    try {
      const success = await this.mediaService.deleteFile(id);
      if (!success) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('process')
  async processFile(@Body() processDto: ProcessFileDto) {
    try {
      const file = await this.mediaService.getFileById(processDto.fileId);
      if (!file) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      let result: string | null = null;

      switch (processDto.operation) {
        case 'thumbnail':
          if (processDto.options.width && processDto.options.height) {
            result = await this.processingService.generateThumbnail(
              file.localPath || file.url,
              processDto.options.width,
              processDto.options.height,
            );
          }
          break;

        case 'compress':
          if (processDto.options.quality) {
            const fileType = this.getFileType(file.mimeType);
            result = await this.processingService.compressFile(
              file.localPath || file.url,
              fileType,
              processDto.options.quality,
            );
          }
          break;

        case 'convert':
          if (processDto.options.format) {
            result = await this.processingService.convertFormat(
              file.localPath || file.url,
              processDto.options.format,
            );
          }
          break;

        default:
          throw new HttpException(
            'Invalid operation',
            HttpStatus.BAD_REQUEST,
          );
      }

      if (!result) {
        throw new HttpException(
          'Processing failed',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        success: true,
        data: { processedFilePath: result },
        message: 'File processed successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('info/:id')
  async getMediaInfo(@Param('id') id: string) {
    try {
      const file = await this.mediaService.getFileById(id);
      if (!file) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      const mediaInfo = await this.processingService.extractMediaInfo(
        file.localPath || file.url,
      );

      return {
        success: true,
        data: mediaInfo,
        message: 'Media info retrieved successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to get media info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('deduplicate')
  async deduplicateFiles(@Body('fileIds') fileIds: string[]) {
    try {
      if (!fileIds || fileIds.length === 0) {
        throw new HttpException(
          'No file IDs provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      const files = await Promise.all(
        fileIds.map(id => this.mediaService.getFileById(id)),
      );

      const validFiles = files.filter(file => file !== null);
      const filePaths = validFiles.map(
        file => file!.localPath || file!.url,
      );

      const result = await this.processingService.deduplicateFiles(filePaths);

      return {
        success: true,
        data: result,
        message: 'Deduplication completed successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Deduplication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  async getStats() {
    try {
      const [mediaStats, processingStats, minioStats] = await Promise.all([
        this.mediaService.getStats(),
        this.processingService.getProcessingStats(),
        this.minioService.getStorageStats(),
      ]);

      return {
        success: true,
        data: {
          media: mediaStats,
          processing: processingStats,
          storage: minioStats,
        },
        message: 'Stats retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cleanup')
  async cleanup() {
    try {
      const deletedCount = await this.processingService.cleanupTempFiles();

      return {
        success: true,
        data: { deletedFiles: deletedCount },
        message: 'Cleanup completed successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('download-info')
  async getDownloadInfo() {
    try {
      const info = await this.downloadService.getDownloadDirInfo();

      return {
        success: true,
        data: info,
        message: 'Download info retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get download info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('minio/health')
  async checkMinioHealth() {
    try {
      const isHealthy = await this.minioService.healthCheck();

      return {
        success: true,
        data: { healthy: isHealthy },
        message: isHealthy ? 'MinIO is healthy' : 'MinIO is not healthy',
      };
    } catch (error) {
      throw new HttpException(
        `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getFileType(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
    if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (mimeType.startsWith('video/')) {
      return 'video';
    } else if (mimeType.startsWith('audio/')) {
      return 'audio';
    } else {
      return 'document';
    }
  }
}