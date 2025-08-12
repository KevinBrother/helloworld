import { Injectable, Logger } from '@nestjs/common';
import { ExtractedData } from '../../crawler/dto/crawl-result.dto';

export interface ExtractionRule {
  name: string;
  selector: string;
  type: 'text' | 'html' | 'attribute' | 'link' | 'image';
  attribute?: string;
  multiple?: boolean;
  transform?: string; // 数据转换规则
}

export interface DataCleaningRule {
  field: string;
  rules: {
    trim?: boolean;
    removeHtml?: boolean;
    regex?: { pattern: string; replacement: string };
    validate?: string; // 验证规则
  };
}

@Injectable()
export class DataProcessingService {
  private readonly logger = new Logger(DataProcessingService.name);

  /**
   * 根据提取规则处理原始数据
   */
  processExtractedData(
    data: ExtractedData,
    rules?: ExtractionRule[],
  ): ExtractedData {
    if (!rules || rules.length === 0) {
      return data;
    }

    const processedData: ExtractedData = {};

    for (const rule of rules) {
      try {
        const value = data[rule.name];
        if (value !== undefined) {
          processedData[rule.name] = this.applyTransformation(
            value,
            rule,
          );
        }
      } catch (error) {
        this.logger.warn(`处理字段 ${rule.name} 时出错:`, error);
        processedData[rule.name] = null;
      }
    }

    return processedData;
  }

  /**
   * 清洗数据
   */
  cleanData(
    data: ExtractedData,
    cleaningRules?: DataCleaningRule[],
  ): ExtractedData {
    if (!cleaningRules || cleaningRules.length === 0) {
      return data;
    }

    const cleanedData: ExtractedData = { ...data };

    for (const rule of cleaningRules) {
      try {
        const value = cleanedData[rule.field];
        if (value !== undefined && value !== null) {
          cleanedData[rule.field] = this.applyCleaningRules(value, rule.rules);
        }
      } catch (error) {
        this.logger.warn(`清洗字段 ${rule.field} 时出错:`, error);
      }
    }

    return cleanedData;
  }

  /**
   * 应用数据转换
   */
  private applyTransformation(
    value: unknown,
    rule: ExtractionRule,
  ): unknown {
    if (!rule.transform) {
      return value;
    }

    // 这里可以实现各种转换逻辑
    // 例如：日期格式化、数字转换、字符串处理等
    switch (rule.transform) {
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'number':
        return typeof value === 'string' ? parseFloat(value) : value;
      default:
        return value;
    }
  }

  /**
   * 应用清洗规则
   */
  private applyCleaningRules(
    value: unknown,
    rules: DataCleaningRule['rules'],
  ): unknown {
    let result = value;

    if (typeof result === 'string') {
      if (rules.trim) {
        result = result.trim();
      }

      if (rules.removeHtml) {
        result = (result as string).replace(/<[^>]*>/g, '');
      }

      if (rules.regex) {
        const regex = new RegExp(rules.regex.pattern, 'g');
        result = (result as string).replace(regex, rules.regex.replacement);
      }
    }

    return result;
  }

  /**
   * 数据去重
   */
  deduplicateData(dataArray: ExtractedData[]): ExtractedData[] {
    const seen = new Set<string>();
    const uniqueData: ExtractedData[] = [];

    for (const item of dataArray) {
      const key = this.generateDataKey(item);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueData.push(item);
      }
    }

    return uniqueData;
  }

  /**
   * 生成数据唯一键
   */
  private generateDataKey(data: ExtractedData): string {
    // 简单的哈希生成，实际项目中可能需要更复杂的逻辑
    return JSON.stringify(data);
  }
}