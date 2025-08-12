import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface MediaInfo {
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  format?: string;
  codec?: string;
  metadata?: Record<string, any>;
}

export interface ThumbnailOptions {
  width: number;
  height: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface CompressionOptions {
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: string;
}

@Injectable()
export class MediaProcessingService {
  private readonly tempDir = './temp';
  private readonly thumbnailDir = './thumbnails';
  private readonly processedDir = './processed';

  constructor() {
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = [this.tempDir, this.thumbnailDir, this.processedDir];
    
    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  async extractMediaInfo(filePath: string): Promise<MediaInfo | null> {
    try {
      const fileExtension = path.extname(filePath).toLowerCase();
      
      if (this.isImageFile(fileExtension)) {
        return await this.extractImageInfo(filePath);
      } else if (this.isVideoFile(fileExtension)) {
        return await this.extractVideoInfo(filePath);
      } else if (this.isAudioFile(fileExtension)) {
        return await this.extractAudioInfo(filePath);
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to extract media info from ${filePath}:`, error);
      return null;
    }
  }

  private async extractImageInfo(filePath: string): Promise<MediaInfo | null> {
    try {
      // 简化的图片信息提取（实际项目中可以使用sharp或jimp库）
      const stats = await fs.stat(filePath);
      const buffer = await fs.readFile(filePath);
      
      // 基本的图片尺寸检测（简化版本）
      const dimensions = await this.getImageDimensions(buffer);
      
      return {
        width: dimensions.width,
        height: dimensions.height,
        format: path.extname(filePath).substring(1),
        metadata: {
          fileSize: stats.size,
          lastModified: stats.mtime,
        },
      };
    } catch (error) {
      console.error(`Failed to extract image info:`, error);
      return null;
    }
  }

  private async extractVideoInfo(filePath: string): Promise<MediaInfo | null> {
    try {
      // 简化的视频信息提取（实际项目中可以使用ffprobe）
      const stats = await fs.stat(filePath);
      
      return {
        format: path.extname(filePath).substring(1),
        metadata: {
          fileSize: stats.size,
          lastModified: stats.mtime,
        },
      };
    } catch (error) {
      console.error(`Failed to extract video info:`, error);
      return null;
    }
  }

  private async extractAudioInfo(filePath: string): Promise<MediaInfo | null> {
    try {
      // 简化的音频信息提取
      const stats = await fs.stat(filePath);
      
      return {
        format: path.extname(filePath).substring(1),
        metadata: {
          fileSize: stats.size,
          lastModified: stats.mtime,
        },
      };
    } catch (error) {
      console.error(`Failed to extract audio info:`, error);
      return null;
    }
  }

  private async getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
    // 简化的图片尺寸检测
    // 实际项目中应该使用专业的图片处理库如sharp
    
    // JPEG文件头检测
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      return this.getJPEGDimensions(buffer);
    }
    
    // PNG文件头检测
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
      return this.getPNGDimensions(buffer);
    }
    
    // 默认返回
    return { width: 0, height: 0 };
  }

  private getJPEGDimensions(buffer: Buffer): { width: number; height: number } {
    try {
      let offset = 2;
      while (offset < buffer.length) {
        const marker = buffer.readUInt16BE(offset);
        offset += 2;
        
        if (marker >= 0xFFC0 && marker <= 0xFFC3) {
          const height = buffer.readUInt16BE(offset + 3);
          const width = buffer.readUInt16BE(offset + 5);
          return { width, height };
        }
        
        const segmentLength = buffer.readUInt16BE(offset);
        offset += segmentLength;
      }
    } catch (error) {
      console.error('Failed to parse JPEG dimensions:', error);
    }
    
    return { width: 0, height: 0 };
  }

  private getPNGDimensions(buffer: Buffer): { width: number; height: number } {
    try {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    } catch (error) {
      console.error('Failed to parse PNG dimensions:', error);
      return { width: 0, height: 0 };
    }
  }

  async generateThumbnail(
    filePath: string,
    width: number,
    height: number,
    options?: Partial<ThumbnailOptions>,
  ): Promise<string | null> {
    try {
      const fileExtension = path.extname(filePath).toLowerCase();
      
      if (!this.isImageFile(fileExtension)) {
        console.warn(`Cannot generate thumbnail for non-image file: ${filePath}`);
        return null;
      }
      
      const fileName = path.basename(filePath, fileExtension);
      const thumbnailFileName = `${fileName}_thumb_${width}x${height}.jpg`;
      const thumbnailPath = path.join(this.thumbnailDir, thumbnailFileName);
      
      // 简化的缩略图生成（实际项目中使用sharp或canvas）
      await this.createSimpleThumbnail(filePath, thumbnailPath, width, height);
      
      return thumbnailPath;
    } catch (error) {
      console.error(`Failed to generate thumbnail for ${filePath}:`, error);
      return null;
    }
  }

  private async createSimpleThumbnail(
    inputPath: string,
    outputPath: string,
    width: number,
    height: number,
  ): Promise<void> {
    // 简化实现：直接复制原文件作为缩略图
    // 实际项目中应该使用图片处理库进行真正的缩放
    await fs.copyFile(inputPath, outputPath);
    console.log(`Created thumbnail: ${outputPath}`);
  }

  async compressFile(
    filePath: string,
    fileType: 'image' | 'video' | 'audio' | 'document',
    quality: number,
  ): Promise<string | null> {
    try {
      const fileExtension = path.extname(filePath).toLowerCase();
      const fileName = path.basename(filePath, fileExtension);
      const compressedFileName = `${fileName}_compressed${fileExtension}`;
      const compressedPath = path.join(this.processedDir, compressedFileName);
      
      switch (fileType) {
        case 'image':
          return await this.compressImage(filePath, compressedPath, quality);
        case 'video':
          return await this.compressVideo(filePath, compressedPath, quality);
        case 'audio':
          return await this.compressAudio(filePath, compressedPath, quality);
        default:
          console.warn(`Compression not supported for file type: ${fileType}`);
          return null;
      }
    } catch (error) {
      console.error(`Failed to compress file ${filePath}:`, error);
      return null;
    }
  }

  private async compressImage(
    inputPath: string,
    outputPath: string,
    quality: number,
  ): Promise<string | null> {
    try {
      // 简化实现：直接复制文件
      // 实际项目中应该使用sharp进行真正的压缩
      await fs.copyFile(inputPath, outputPath);
      console.log(`Compressed image: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('Failed to compress image:', error);
      return null;
    }
  }

  private async compressVideo(
    inputPath: string,
    outputPath: string,
    quality: number,
  ): Promise<string | null> {
    try {
      // 简化实现：直接复制文件
      // 实际项目中应该使用ffmpeg进行真正的压缩
      await fs.copyFile(inputPath, outputPath);
      console.log(`Compressed video: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('Failed to compress video:', error);
      return null;
    }
  }

  private async compressAudio(
    inputPath: string,
    outputPath: string,
    quality: number,
  ): Promise<string | null> {
    try {
      // 简化实现：直接复制文件
      // 实际项目中应该使用ffmpeg进行真正的压缩
      await fs.copyFile(inputPath, outputPath);
      console.log(`Compressed audio: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('Failed to compress audio:', error);
      return null;
    }
  }

  async convertFormat(
    filePath: string,
    targetFormat: string,
  ): Promise<string | null> {
    try {
      const fileName = path.basename(filePath, path.extname(filePath));
      const convertedFileName = `${fileName}.${targetFormat}`;
      const convertedPath = path.join(this.processedDir, convertedFileName);
      
      // 简化实现：直接复制文件
      // 实际项目中应该使用相应的转换工具
      await fs.copyFile(filePath, convertedPath);
      console.log(`Converted format: ${convertedPath}`);
      
      return convertedPath;
    } catch (error) {
      console.error(`Failed to convert format for ${filePath}:`, error);
      return null;
    }
  }

  async deduplicateFiles(filePaths: string[]): Promise<{
    unique: string[];
    duplicates: string[][];
  }> {
    const checksumMap = new Map<string, string[]>();
    
    // 计算每个文件的校验和
    for (const filePath of filePaths) {
      try {
        const checksum = await this.calculateFileChecksum(filePath);
        if (!checksumMap.has(checksum)) {
          checksumMap.set(checksum, []);
        }
        checksumMap.get(checksum)!.push(filePath);
      } catch (error) {
        console.error(`Failed to calculate checksum for ${filePath}:`, error);
      }
    }
    
    const unique: string[] = [];
    const duplicates: string[][] = [];
    
    checksumMap.forEach(files => {
      if (files.length === 1) {
        unique.push(files[0]);
      } else {
        unique.push(files[0]); // 保留第一个文件
        duplicates.push(files.slice(1)); // 其余为重复文件
      }
    });
    
    return { unique, duplicates };
  }

  private async calculateFileChecksum(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  private isImageFile(extension: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    return imageExtensions.includes(extension);
  }

  private isVideoFile(extension: string): boolean {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'];
    return videoExtensions.includes(extension);
  }

  private isAudioFile(extension: string): boolean {
    const audioExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma'];
    return audioExtensions.includes(extension);
  }

  // 清理临时文件
  async cleanupTempFiles(): Promise<number> {
    try {
      const dirs = [this.tempDir, this.thumbnailDir, this.processedDir];
      let deletedCount = 0;
      
      for (const dir of dirs) {
        const files = await fs.readdir(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
      return 0;
    }
  }

  // 获取处理统计信息
  async getProcessingStats(): Promise<{
    tempFiles: number;
    thumbnails: number;
    processedFiles: number;
    totalSize: number;
  }> {
    try {
      const stats = {
        tempFiles: 0,
        thumbnails: 0,
        processedFiles: 0,
        totalSize: 0,
      };
      
      const dirs = [
        { path: this.tempDir, key: 'tempFiles' as const },
        { path: this.thumbnailDir, key: 'thumbnails' as const },
        { path: this.processedDir, key: 'processedFiles' as const },
      ];
      
      for (const { path: dirPath, key } of dirs) {
        const files = await fs.readdir(dirPath);
        stats[key] = files.length;
        
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const fileStat = await fs.stat(filePath);
          stats.totalSize += fileStat.size;
        }
      }
      
      return stats;
    } catch (error) {
      console.error('Failed to get processing stats:', error);
      return {
        tempFiles: 0,
        thumbnails: 0,
        processedFiles: 0,
        totalSize: 0,
      };
    }
  }
}