import * as crypto from 'crypto';

export class PathGenerator {
  /**
   * 生成URL的哈希值
   */
  static generateUrlHash(url: string): string {
    return crypto.createHash('md5').update(url).digest('hex');
  }

  /**
   * 从URL提取域名
   */
  static extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      // 如果URL解析失败，返回一个安全的默认值
      return 'unknown-domain';
    }
  }

  /**
   * URL路径安全化处理
   */
  static sanitizePath(urlPath: string): string {
    return urlPath
      .replace(/^\/+/g, '')           // 移除开头的 /
      .replace(/\/+$/g, '')           // 移除结尾的 /
      .replace(/[<>:"|?*]/g, '_')     // 替换非法字符
      .replace(/\.{2,}/g, '_')        // 替换连续的点
      .replace(/\s+/g, '_')           // 替换空格
      .split('/')
      .map(segment => {
        if (segment === '' || segment === '.' || segment === '..') {
          return '_';
        }
        return segment.length > 100 ? segment.substring(0, 100) + '_hash' : segment;
      })
      .join('/');
  }

  /**
   * 获取URL路径的目录路径
   */
  static getDirectoryPath(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      
      if (path === '/' || path === '') {
        return '_root';  // 根路径特殊处理
      }
      
      return this.sanitizePath(path);
    } catch (error) {
      return '_unknown';
    }
  }

  /**
   * 生成页面数据存储路径（新的混合方案）
   */
  static generatePagePath(url: string, sessionId?: string): string {
    const domain = this.extractDomain(url);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const urlPath = this.getDirectoryPath(url);
    
    return `domain/${domain}/${year}/${month}/${day}/pages/${urlPath}`;
  }

  /**
   * 生成会话路径（按域名组织）
   */
  static generateSessionPath(sessionId: string, domain?: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    if (domain) {
      return `domain/${domain}/${year}/${month}/${day}/sessions`;
    }
    
    // 兼容旧版本，如果没有域名则使用旧路径
    return `sessions/${year}/${month}/${day}`;
  }

  /**
   * 生成索引文件路径
   */
  static generateIndexPath(domain: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    return `domain/${domain}/${year}/${month}/${day}/index`;
  }

  /**
   * 清理文件名中的非法字符
   */
  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[<>:"/\\|?*]/g, '_') // 替换非法字符
      .replace(/\s+/g, '_') // 替换空格
      .substring(0, 255); // 限制长度
  }

  /**
   * 生成唯一的会话ID
   */
  static generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomStr}`;
  }
}