import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright';
import { MediaTypeConfig, MediaFileInfo } from '../../shared/interfaces/crawler.interface';

@Injectable()
export class MediaDetectorService {
  private readonly logger = new Logger(MediaDetectorService.name);

  // 预设的文件扩展名
  private readonly DEFAULT_EXTENSIONS = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
    video: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v'],
    audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'],
    document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'],
    archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz']
  };

  /**
   * 检测页面中的媒体文件
   */
  async detectMediaFiles(
    page: Page,
    sourceUrl: string,
    mediaTypes: MediaTypeConfig[]
  ): Promise<MediaFileInfo[]> {
    const mediaFiles: MediaFileInfo[] = [];
    
    try {
      // 获取所有可能的媒体元素
      const mediaElements = await this.extractMediaElements(page);
      
      for (const element of mediaElements) {
        const mediaFile = this.processMediaElement(element, sourceUrl, mediaTypes);
        if (mediaFile) {
          mediaFiles.push(mediaFile);
        }
      }
      
      this.logger.log(`在页面 ${sourceUrl} 中检测到 ${mediaFiles.length} 个媒体文件`);
      return mediaFiles;
    } catch (error) {
      this.logger.error(`检测媒体文件失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 从页面提取媒体元素
   */
  private async extractMediaElements(page: Page): Promise<any[]> {
    return await page.evaluate(() => {
      const elements = [];
      
      // 图片元素
      const images = document.querySelectorAll('img[src]');
      images.forEach(img => {
        const imgElement = img as HTMLImageElement;
        elements.push({
          type: 'image',
          url: imgElement.src,
          alt: imgElement.alt || '',
          tagName: 'img'
        });
      });
      
      // 视频元素
      const videos = document.querySelectorAll('video[src]');
      videos.forEach(video => {
        const videoElement = video as HTMLVideoElement;
        if (videoElement.src) {
          elements.push({
            type: 'video',
            url: videoElement.src,
            tagName: 'video'
          });
        }
      });
      
      // 视频source元素
      const videoSources = document.querySelectorAll('video source[src]');
      videoSources.forEach(source => {
        const sourceElement = source as HTMLSourceElement;
        if (sourceElement.src) {
          elements.push({
            type: 'video',
            url: sourceElement.src,
            tagName: 'source'
          });
        }
      });
      
      // 音频元素
      const audios = document.querySelectorAll('audio[src]');
      audios.forEach(audio => {
        const audioElement = audio as HTMLAudioElement;
        if (audioElement.src) {
          elements.push({
            type: 'audio',
            url: audioElement.src,
            tagName: 'audio'
          });
        }
      });
      
      // 音频source元素
      const audioSources = document.querySelectorAll('audio source[src]');
      audioSources.forEach(source => {
        const sourceElement = source as HTMLSourceElement;
        if (sourceElement.src) {
          elements.push({
            type: 'audio',
            url: sourceElement.src,
            tagName: 'source'
          });
        }
      });
      
      // 链接元素（可能指向文档或压缩包）
      const links = document.querySelectorAll('a[href]');
      links.forEach(link => {
        const linkElement = link as HTMLAnchorElement;
        const href = linkElement.href;
        const text = linkElement.textContent?.trim() || '';
        if (href && href !== window.location.href) {
          elements.push({
            type: 'link',
            url: href,
            text: text,
            tagName: 'a'
          });
        }
      });
      
      return elements;
    });
  }

  /**
   * 处理媒体元素
   */
  private processMediaElement(
    element: any,
    sourceUrl: string,
    mediaTypes: MediaTypeConfig[]
  ): MediaFileInfo | null {
    try {
      const url = this.resolveUrl(element.url, sourceUrl);
      const extension = this.extractExtension(url);
      
      if (!extension) {
        return null;
      }
      
      const mediaType = this.determineMediaType(extension, element.type, mediaTypes);
      
      if (!mediaType) {
        return null;
      }
      
      const fileName = this.generateFileName(url, extension);
      
      return {
        url,
        type: mediaType,
        extension,
        fileName,
        sourceUrl,
        metadata: {
          tagName: element.tagName,
          alt: element.alt,
          text: element.text
        }
      };
    } catch (error) {
      this.logger.warn(`处理媒体元素失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 解析相对URL为绝对URL
   */
  private resolveUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }

  /**
   * 提取文件扩展名
   */
  private extractExtension(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const match = pathname.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
      return match ? match[1].toLowerCase() : null;
    } catch {
      return null;
    }
  }

  /**
   * 确定媒体类型
   */
  private determineMediaType(
    extension: string,
    elementType: string,
    mediaTypes: MediaTypeConfig[]
  ): 'image' | 'video' | 'audio' | 'document' | 'archive' | null {
    for (const config of mediaTypes) {
      const allowedExtensions = this.getAllowedExtensions(config);
      
      if (allowedExtensions.includes(extension)) {
        return config.type;
      }
    }
    
    return null;
  }

  /**
   * 获取允许的扩展名列表
   */
  private getAllowedExtensions(config: MediaTypeConfig): string[] {
    const defaultExtensions = this.DEFAULT_EXTENSIONS[config.type] || [];
    const customExtensions = config.extensions || [];
    
    if (config.mode === 'override') {
      return customExtensions;
    } else {
      // inherit mode
      return [...defaultExtensions, ...customExtensions];
    }
  }

  /**
   * 生成文件名
   */
  private generateFileName(url: string, extension: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.split('/').pop() || 'unknown';
      
      // 如果文件名没有扩展名，添加扩展名
      if (!fileName.includes('.')) {
        return `${fileName}.${extension}`;
      }
      
      return fileName;
    } catch {
      return `unknown.${extension}`;
    }
  }
}