/**
 * 存储配置 - 定义爬虫数据存储的命名策略和结构
 */

export interface StorageConfig {
  buckets: {
    pages: string;
    screenshots: string;
    metadata: string;
    logs: string;
  };
  naming: {
    pageFile: string;
    screenshotFile: string;
    indexFile: string;
  };
  structure: {
    byDomain: boolean;
    byDate: boolean;
    dateFormat: string;
  };
}

export const STORAGE_CONFIG: StorageConfig = {
  buckets: {
    pages: 'crawler-pages',
    screenshots: 'crawler-screenshots',
    metadata: 'crawler-metadata',
    logs: 'crawler-logs'
  },
  naming: {
    pageFile: '{depth}-{sequence:03d}-{urlHash}-{timestamp}.json',
    screenshotFile: '{depth}-{sequence:03d}-{urlHash}-{timestamp}.png',
    indexFile: 'index-{date}.json'
  },
  structure: {
    byDomain: true,
    byDate: true,
    dateFormat: 'YYYY/MM/DD'
  }
};

/**
 * 路径生成器
 */
export class PathGenerator {
  /**
   * 生成域名路径
   */
  static generateDomainPath(url: string): string {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname;
    } catch (error) {
      return 'unknown-domain';
    }
  }

  /**
   * 生成日期路径
   */
  static generateDatePath(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  /**
   * 生成完整的目录路径
   */
  static generateDirectoryPath(url: string, date: Date = new Date()): string {
    const domainPath = this.generateDomainPath(url);
    const datePath = this.generateDatePath(date);
    return `domain/${domainPath}/${datePath}/pages`;
  }

  /**
   * 生成文件名
   */
  static generateFileName(
    template: string,
    params: {
      depth: number;
      sequence: number;
      urlHash: string;
      timestamp: string;
      date?: string;
    }
  ): string {
    let fileName = template;
    
    // 替换模板变量
    fileName = fileName.replace('{depth}', params.depth.toString());
    fileName = fileName.replace('{sequence:03d}', params.sequence.toString().padStart(3, '0'));
    fileName = fileName.replace('{urlHash}', params.urlHash);
    fileName = fileName.replace('{timestamp}', params.timestamp);
    
    if (params.date) {
      fileName = fileName.replace('{date}', params.date);
    }
    
    return fileName;
  }

  /**
   * 生成URL哈希
   */
  static generateUrlHash(url: string): string {
    return Buffer.from(url)
      .toString('base64')
      .replace(/[+/=]/g, '')
      .substring(0, 8);
  }

  /**
   * 生成时间戳
   */
  static generateTimestamp(date: Date = new Date()): string {
    return date.toISOString().replace(/[:.]/g, '-').replace('T', 'T').slice(0, -5) + 'Z';
  }

  /**
   * 生成日期字符串
   */
  static generateDateString(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}

/**
 * 会话管理器
 */
export class SessionManager {
  private static currentSession: {
    id: string;
    startTime: Date;
    baseUrl: string;
    sequence: number;
    config: any;
    files: string[];
  } | null = null;

  /**
   * 开始新的爬取会话
   */
  static startSession(baseUrl: string, config: any): string {
    const now = new Date();
    const sessionId = `session-${PathGenerator.generateTimestamp(now)}`;
    
    this.currentSession = {
      id: sessionId,
      startTime: now,
      baseUrl,
      sequence: 0,
      config,
      files: []
    };
    
    return sessionId;
  }

  /**
   * 获取下一个序号
   */
  static getNextSequence(): number {
    if (!this.currentSession) {
      throw new Error('没有活动的爬取会话');
    }
    return ++this.currentSession.sequence;
  }

  /**
   * 添加文件到会话
   */
  static addFile(filePath: string): void {
    if (this.currentSession) {
      this.currentSession.files.push(filePath);
    }
  }

  /**
   * 获取当前会话信息
   */
  static getCurrentSession() {
    return this.currentSession;
  }

  /**
   * 结束会话
   */
  static endSession() {
    const session = this.currentSession;
    this.currentSession = null;
    return session;
  }
}