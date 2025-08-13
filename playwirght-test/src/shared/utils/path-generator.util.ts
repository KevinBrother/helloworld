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
   * 生成页面数据存储路径
   */
  static generatePagePath(url: string, sessionId: string): string {
    const domain = this.extractDomain(url);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    return `domain/${domain}/${year}/${month}/${day}/pages/${sessionId}`;
  }

  /**
   * 生成截图存储路径
   */
  static generateScreenshotPath(url: string, sessionId: string): string {
    const domain = this.extractDomain(url);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    return `domain/${domain}/${year}/${month}/${day}/screenshots/${sessionId}`;
  }

  /**
   * 生成会话路径
   */
  static generateSessionPath(sessionId: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    return `sessions/${year}/${month}/${day}/${sessionId}`;
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