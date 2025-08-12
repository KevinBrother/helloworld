import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

export interface DownloadResult {
  originalName: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  checksum: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class FileDownloadService {
  private readonly downloadDir = './downloads';
  private readonly maxRetries = 3;
  private readonly timeout = 30000; // 30秒超时

  constructor() {
    this.ensureDownloadDir();
  }

  private async ensureDownloadDir(): Promise<void> {
    try {
      await fs.access(this.downloadDir);
    } catch {
      await fs.mkdir(this.downloadDir, { recursive: true });
    }
  }

  async downloadFile(
    url: string,
    maxFileSize?: number,
  ): Promise<DownloadResult | null> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < this.maxRetries) {
      try {
        return await this.attemptDownload(url, maxFileSize);
      } catch (error) {
        lastError = error as Error;
        attempt++;
        console.warn(`Download attempt ${attempt} failed for ${url}:`, error);
        
        if (attempt < this.maxRetries) {
          // 指数退避
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    console.error(`Failed to download ${url} after ${this.maxRetries} attempts:`, lastError);
    return null;
  }

  private async attemptDownload(
    url: string,
    maxFileSize?: number,
  ): Promise<DownloadResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const fileSize = contentLength ? parseInt(contentLength, 10) : 0;

      // 检查文件大小
      if (maxFileSize && fileSize > maxFileSize) {
        throw new Error(`File size ${fileSize} exceeds maximum ${maxFileSize}`);
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const originalName = this.extractFilenameFromUrl(url) || this.extractFilenameFromHeaders(response.headers);
      const fileName = this.generateUniqueFilename(originalName, contentType);
      const filePath = path.join(this.downloadDir, fileName);

      // 下载文件
      const fileStream = createWriteStream(filePath);
      const hash = crypto.createHash('md5');
      let downloadedSize = 0;

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          downloadedSize += value.length;
          
          // 检查下载大小
          if (maxFileSize && downloadedSize > maxFileSize) {
            throw new Error(`Downloaded size ${downloadedSize} exceeds maximum ${maxFileSize}`);
          }

          hash.update(value);
          fileStream.write(value);
        }
      } finally {
        fileStream.end();
        reader.releaseLock();
      }

      const checksum = hash.digest('hex');
      const actualSize = downloadedSize || fileSize;

      return {
        originalName,
        fileName,
        filePath,
        mimeType: contentType,
        size: actualSize,
        checksum,
        metadata: {
          url,
          downloadedAt: new Date().toISOString(),
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getMimeType(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      return response.headers.get('content-type') || 'application/octet-stream';
    } catch (error) {
      console.warn(`Failed to get MIME type for ${url}:`, error);
      return this.guessMimeTypeFromUrl(url);
    }
  }

  private extractFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = path.basename(pathname);
      
      // 如果文件名包含扩展名，返回它
      if (filename && filename.includes('.')) {
        return filename;
      }
      
      return '';
    } catch {
      return '';
    }
  }

  private extractFilenameFromHeaders(headers: Headers): string {
    const contentDisposition = headers.get('content-disposition');
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
      if (filenameMatch && filenameMatch[1]) {
        return filenameMatch[1].replace(/["']/g, '');
      }
    }
    return '';
  }

  private generateUniqueFilename(originalName: string, mimeType: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    if (originalName) {
      const ext = path.extname(originalName);
      const name = path.basename(originalName, ext);
      return `${name}_${timestamp}_${random}${ext}`;
    }
    
    // 根据MIME类型生成扩展名
    const extension = this.getExtensionFromMimeType(mimeType);
    return `file_${timestamp}_${random}${extension}`;
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/ogg': '.ogv',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
      'application/pdf': '.pdf',
      'text/plain': '.txt',
      'text/html': '.html',
      'application/json': '.json',
    };
    
    return mimeToExt[mimeType] || '.bin';
  }

  private guessMimeTypeFromUrl(url: string): string {
    const extension = path.extname(url).toLowerCase();
    const extToMime: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogv': 'video/ogg',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.json': 'application/json',
    };
    
    return extToMime[extension] || 'application/octet-stream';
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error);
      return false;
    }
  }

  async getFileInfo(filePath: string): Promise<{
    size: number;
    mtime: Date;
    exists: boolean;
  }> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime,
        exists: true,
      };
    } catch {
      return {
        size: 0,
        mtime: new Date(),
        exists: false,
      };
    }
  }

  async cleanupOldFiles(olderThanDays: number): Promise<number> {
    try {
      const files = await fs.readdir(this.downloadDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.downloadDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          const success = await this.deleteFile(filePath);
          if (success) {
            deletedCount++;
          }
        }
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup old files:', error);
      return 0;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 获取下载目录信息
  async getDownloadDirInfo(): Promise<{
    path: string;
    totalFiles: number;
    totalSize: number;
  }> {
    try {
      const files = await fs.readdir(this.downloadDir);
      let totalSize = 0;
      
      for (const file of files) {
        const filePath = path.join(this.downloadDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }
      
      return {
        path: this.downloadDir,
        totalFiles: files.length,
        totalSize,
      };
    } catch (error) {
      console.error('Failed to get download directory info:', error);
      return {
        path: this.downloadDir,
        totalFiles: 0,
        totalSize: 0,
      };
    }
  }
}