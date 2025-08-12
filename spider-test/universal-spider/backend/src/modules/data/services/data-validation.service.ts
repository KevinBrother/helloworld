import { Injectable, Logger } from '@nestjs/common';
import { ExtractedData } from '../../crawler/dto/crawl-result.dto';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  custom?: (value: unknown) => boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class DataValidationService {
  private readonly logger = new Logger(DataValidationService.name);

  /**
   * 验证提取的数据
   */
  validateData(
    data: ExtractedData,
    rules: ValidationRule[],
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    for (const rule of rules) {
      const fieldResult = this.validateField(data[rule.field], rule);
      
      if (!fieldResult.isValid) {
        result.isValid = false;
        result.errors.push(...fieldResult.errors);
      }
      
      result.warnings.push(...fieldResult.warnings);
    }

    return result;
  }

  /**
   * 验证单个字段
   */
  private validateField(
    value: unknown,
    rule: ValidationRule,
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // 检查必填字段
    if (rule.required && (value === undefined || value === null || value === '')) {
      result.isValid = false;
      result.errors.push(`字段 ${rule.field} 是必填的`);
      return result;
    }

    // 如果值为空且不是必填，跳过其他验证
    if (value === undefined || value === null || value === '') {
      return result;
    }

    // 类型验证
    if (rule.type && !this.validateType(value, rule.type)) {
      result.isValid = false;
      result.errors.push(`字段 ${rule.field} 类型不正确，期望 ${rule.type}`);
    }

    // 长度验证（针对字符串和数组）
    if (typeof value === 'string' || Array.isArray(value)) {
      const length = value.length;
      
      if (rule.minLength !== undefined && length < rule.minLength) {
        result.isValid = false;
        result.errors.push(`字段 ${rule.field} 长度不能少于 ${rule.minLength}`);
      }
      
      if (rule.maxLength !== undefined && length > rule.maxLength) {
        result.isValid = false;
        result.errors.push(`字段 ${rule.field} 长度不能超过 ${rule.maxLength}`);
      }
    }

    // 正则表达式验证
    if (rule.pattern && typeof value === 'string') {
      const regex = new RegExp(rule.pattern);
      if (!regex.test(value)) {
        result.isValid = false;
        result.errors.push(`字段 ${rule.field} 格式不正确`);
      }
    }

    // 自定义验证
    if (rule.custom && !rule.custom(value)) {
      result.isValid = false;
      result.errors.push(`字段 ${rule.field} 自定义验证失败`);
    }

    return result;
  }

  /**
   * 验证数据类型
   */
  private validateType(value: unknown, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * 数据质量评估
   */
  assessDataQuality(data: ExtractedData[]): {
    completeness: number;
    accuracy: number;
    consistency: number;
    summary: string;
  } {
    if (data.length === 0) {
      return {
        completeness: 0,
        accuracy: 0,
        consistency: 0,
        summary: '无数据',
      };
    }

    // 计算完整性（非空字段比例）
    const completeness = this.calculateCompleteness(data);
    
    // 计算准确性（基于数据格式和类型）
    const accuracy = this.calculateAccuracy(data);
    
    // 计算一致性（数据结构一致性）
    const consistency = this.calculateConsistency(data);

    const summary = this.generateQualitySummary(completeness, accuracy, consistency);

    return {
      completeness,
      accuracy,
      consistency,
      summary,
    };
  }

  private calculateCompleteness(data: ExtractedData[]): number {
    let totalFields = 0;
    let nonEmptyFields = 0;

    for (const item of data) {
      for (const [key, value] of Object.entries(item)) {
        totalFields++;
        if (value !== null && value !== undefined && value !== '') {
          nonEmptyFields++;
        }
      }
    }

    return totalFields > 0 ? (nonEmptyFields / totalFields) * 100 : 0;
  }

  private calculateAccuracy(data: ExtractedData[]): number {
    // 简化的准确性计算，实际项目中可能需要更复杂的逻辑
    let validFields = 0;
    let totalFields = 0;

    for (const item of data) {
      for (const [key, value] of Object.entries(item)) {
        totalFields++;
        if (this.isValidValue(value)) {
          validFields++;
        }
      }
    }

    return totalFields > 0 ? (validFields / totalFields) * 100 : 0;
  }

  private calculateConsistency(data: ExtractedData[]): number {
    if (data.length <= 1) return 100;

    const firstItemKeys = Object.keys(data[0]).sort();
    let consistentItems = 1;

    for (let i = 1; i < data.length; i++) {
      const currentKeys = Object.keys(data[i]).sort();
      if (JSON.stringify(firstItemKeys) === JSON.stringify(currentKeys)) {
        consistentItems++;
      }
    }

    return (consistentItems / data.length) * 100;
  }

  private isValidValue(value: unknown): boolean {
    // 简单的有效性检查
    if (value === null || value === undefined || value === '') {
      return false;
    }
    
    if (typeof value === 'string') {
      // 检查是否包含明显的错误标记
      const errorPatterns = ['error', 'undefined', 'null', 'NaN'];
      return !errorPatterns.some(pattern => 
        value.toLowerCase().includes(pattern)
      );
    }
    
    return true;
  }

  private generateQualitySummary(
    completeness: number,
    accuracy: number,
    consistency: number,
  ): string {
    const average = (completeness + accuracy + consistency) / 3;
    
    if (average >= 90) {
      return '数据质量优秀';
    } else if (average >= 70) {
      return '数据质量良好';
    } else if (average >= 50) {
      return '数据质量一般';
    } else {
      return '数据质量较差';
    }
  }
}