import { Injectable, Logger } from '@nestjs/common';
import { ExtractedData } from '../dto/crawl-result.dto';

export interface QualityCheckResult {
  isValid: boolean;
  score: number; // 0-100
  issues: QualityIssue[];
  suggestions: string[];
}

export interface QualityIssue {
  type: 'missing_field' | 'invalid_format' | 'low_quality' | 'duplicate' | 'suspicious';
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface DataCleaningOptions {
  removeEmptyFields?: boolean;
  trimWhitespace?: boolean;
  validateUrls?: boolean;
  deduplicateLinks?: boolean;
  minContentLength?: number;
  maxContentLength?: number;
}

@Injectable()
export class DataQualityService {
  private readonly logger = new Logger(DataQualityService.name);

  /**
   * 检查数据质量
   */
  checkQuality(data: ExtractedData): QualityCheckResult {
    const issues: QualityIssue[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // 检查必要字段
    if (!data.title || data.title.trim().length === 0) {
      issues.push({
        type: 'missing_field',
        field: 'title',
        message: '缺少页面标题',
        severity: 'high'
      });
      score -= 20;
      suggestions.push('添加页面标题提取规则');
    }

    if (!data.content || data.content.trim().length === 0) {
      issues.push({
        type: 'missing_field',
        field: 'content',
        message: '缺少页面内容',
        severity: 'high'
      });
      score -= 25;
      suggestions.push('检查内容提取选择器');
    }

    if (!data.url || !this.isValidUrl(data.url)) {
      issues.push({
        type: 'invalid_format',
        field: 'url',
        message: 'URL格式无效',
        severity: 'high'
      });
      score -= 15;
    }

    // 检查内容质量
    if (data.content && data.content.length < 50) {
      issues.push({
        type: 'low_quality',
        field: 'content',
        message: '内容过短，可能提取不完整',
        severity: 'medium'
      });
      score -= 10;
      suggestions.push('优化内容提取规则，确保获取完整内容');
    }

    if (data.content && data.content.length > 50000) {
      issues.push({
        type: 'suspicious',
        field: 'content',
        message: '内容过长，可能包含无关信息',
        severity: 'low'
      });
      score -= 5;
      suggestions.push('添加内容过滤规则，移除导航、广告等无关内容');
    }

    // 检查元数据质量
    if (!data.description || data.description.trim().length === 0) {
      issues.push({
        type: 'missing_field',
        field: 'description',
        message: '缺少页面描述',
        severity: 'medium'
      });
      score -= 5;
    }

    if (!data.keywords || data.keywords.length === 0) {
      issues.push({
        type: 'missing_field',
        field: 'keywords',
        message: '缺少关键词',
        severity: 'low'
      });
      score -= 3;
    }

    // 检查链接质量
    if (data.links && data.links.length > 0) {
      const invalidLinks = data.links.filter(link => !this.isValidUrl(link.href));
      if (invalidLinks.length > 0) {
        issues.push({
          type: 'invalid_format',
          field: 'links',
          message: `发现 ${invalidLinks.length} 个无效链接`,
          severity: 'medium'
        });
        score -= Math.min(10, invalidLinks.length);
      }

      // 检查重复链接
      const uniqueLinks = new Set(data.links.map(link => link.href));
      if (uniqueLinks.size < data.links.length) {
        issues.push({
          type: 'duplicate',
          field: 'links',
          message: '存在重复链接',
          severity: 'low'
        });
        score -= 2;
        suggestions.push('启用链接去重功能');
      }
    }

    // 检查图片质量
    if (data.images && data.images.length > 0) {
      const invalidImages = data.images.filter(img => !this.isValidUrl(img.src));
      if (invalidImages.length > 0) {
        issues.push({
          type: 'invalid_format',
          field: 'images',
          message: `发现 ${invalidImages.length} 个无效图片链接`,
          severity: 'medium'
        });
        score -= Math.min(5, invalidImages.length);
      }
    }

    // 检查性能数据
    if (data.performance) {
      if (data.performance.loadTime && data.performance.loadTime > 10000) {
        issues.push({
          type: 'suspicious',
          field: 'performance.loadTime',
          message: '页面加载时间过长',
          severity: 'medium'
        });
        score -= 5;
        suggestions.push('检查网络连接或页面复杂度');
      }
    }

    // 确保分数不低于0
    score = Math.max(0, score);

    return {
      isValid: score >= 60,
      score,
      issues,
      suggestions
    };
  }

  /**
   * 清洗数据
   */
  cleanData(data: ExtractedData, options: DataCleaningOptions = {}): ExtractedData {
    const cleaned = { ...data };

    // 移除空字段
    if (options.removeEmptyFields) {
      Object.keys(cleaned).forEach(key => {
        const value = cleaned[key];
        if (value === null || value === undefined || value === '') {
          delete cleaned[key];
        }
      });
    }

    // 清理空白字符
    if (options.trimWhitespace) {
      if (cleaned.title) cleaned.title = cleaned.title.trim();
      if (cleaned.content) cleaned.content = this.cleanContent(cleaned.content);
      if (cleaned.description) cleaned.description = cleaned.description.trim();
      if (cleaned.author) cleaned.author = cleaned.author.trim();
    }

    // 验证和清理URL
    if (options.validateUrls) {
      if (cleaned.url && !this.isValidUrl(cleaned.url)) {
        delete cleaned.url;
      }

      if (cleaned.links) {
        cleaned.links = cleaned.links.filter(link => this.isValidUrl(link.href));
      }

      if (cleaned.images) {
        cleaned.images = cleaned.images.filter(img => this.isValidUrl(img.src));
      }
    }

    // 去重链接
    if (options.deduplicateLinks && cleaned.links) {
      const seen = new Set<string>();
      cleaned.links = cleaned.links.filter(link => {
        if (seen.has(link.href)) {
          return false;
        }
        seen.add(link.href);
        return true;
      });
    }

    // 内容长度限制
    if (cleaned.content) {
      if (options.minContentLength && cleaned.content.length < options.minContentLength) {
        this.logger.warn(`内容长度 ${cleaned.content.length} 小于最小要求 ${options.minContentLength}`);
      }

      if (options.maxContentLength && cleaned.content.length > options.maxContentLength) {
        cleaned.content = cleaned.content.substring(0, options.maxContentLength) + '...';
        this.logger.warn(`内容被截断到 ${options.maxContentLength} 字符`);
      }
    }

    return cleaned;
  }

  /**
   * 验证URL格式
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 清理内容文本
   */
  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ') // 合并多个空白字符
      .replace(/\n\s*\n/g, '\n') // 移除多余的空行
      .trim();
  }

  /**
   * 检测重复内容
   */
  isDuplicate(data1: ExtractedData, data2: ExtractedData): boolean {
    // 简单的重复检测：比较内容哈希
    if (data1.contentHash && data2.contentHash) {
      return data1.contentHash === data2.contentHash;
    }

    // 如果没有哈希，比较标题和URL
    if (data1.title && data2.title && data1.url && data2.url) {
      return data1.title === data2.title && data1.url === data2.url;
    }

    return false;
  }

  /**
   * 生成数据质量报告
   */
  generateQualityReport(results: QualityCheckResult[]): {
    totalItems: number;
    validItems: number;
    averageScore: number;
    commonIssues: { type: string; count: number }[];
    recommendations: string[];
  } {
    const totalItems = results.length;
    const validItems = results.filter(r => r.isValid).length;
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / totalItems;

    // 统计常见问题
    const issueCount = new Map<string, number>();
    const allSuggestions = new Set<string>();

    results.forEach(result => {
      result.issues.forEach(issue => {
        const key = `${issue.type}:${issue.field}`;
        issueCount.set(key, (issueCount.get(key) || 0) + 1);
      });

      result.suggestions.forEach(suggestion => {
        allSuggestions.add(suggestion);
      });
    });

    const commonIssues = Array.from(issueCount.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalItems,
      validItems,
      averageScore: Math.round(averageScore * 100) / 100,
      commonIssues,
      recommendations: Array.from(allSuggestions)
    };
  }
}