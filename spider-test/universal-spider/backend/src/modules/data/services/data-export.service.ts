import { Injectable, Logger } from '@nestjs/common';
import { ExtractedData } from '../../crawler/dto/crawl-result.dto';

export interface ExportOptions {
  format: 'json' | 'csv' | 'xml' | 'excel';
  filename?: string;
  fields?: string[]; // 指定导出的字段
  template?: string; // 自定义模板
  compression?: boolean;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  downloadUrl?: string;
  error?: string;
  fileSize?: number;
}

@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);

  /**
   * 导出数据到指定格式
   */
  async exportData(
    data: ExtractedData[],
    options: ExportOptions,
  ): Promise<ExportResult> {
    try {
      this.logger.log(`开始导出数据，格式: ${options.format}，记录数: ${data.length}`);

      let content: string;
      let mimeType: string;
      let fileExtension: string;

      switch (options.format) {
        case 'json':
          content = this.exportToJson(data, options);
          mimeType = 'application/json';
          fileExtension = 'json';
          break;
        case 'csv':
          content = this.exportToCsv(data, options);
          mimeType = 'text/csv';
          fileExtension = 'csv';
          break;
        case 'xml':
          content = this.exportToXml(data, options);
          mimeType = 'application/xml';
          fileExtension = 'xml';
          break;
        case 'excel':
          // Excel 导出需要特殊处理，这里简化为 CSV
          content = this.exportToCsv(data, options);
          mimeType = 'application/vnd.ms-excel';
          fileExtension = 'xlsx';
          break;
        default:
          throw new Error(`不支持的导出格式: ${options.format}`);
      }

      const filename = options.filename || `export_${Date.now()}.${fileExtension}`;
      const filePath = await this.saveFile(content, filename, mimeType);
      const fileSize = Buffer.byteLength(content, 'utf8');

      this.logger.log(`数据导出完成: ${filename}, 大小: ${fileSize} bytes`);

      return {
        success: true,
        filePath,
        downloadUrl: `/api/files/download/${filename}`,
        fileSize,
      };
    } catch (error) {
      this.logger.error('数据导出失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 导出为 JSON 格式
   */
  private exportToJson(data: ExtractedData[], options: ExportOptions): string {
    const filteredData = this.filterFields(data, options.fields);
    
    if (options.template) {
      return this.applyTemplate(filteredData, options.template);
    }
    
    return JSON.stringify(filteredData, null, 2);
  }

  /**
   * 导出为 CSV 格式
   */
  private exportToCsv(data: ExtractedData[], options: ExportOptions): string {
    if (data.length === 0) {
      return '';
    }

    const filteredData = this.filterFields(data, options.fields);
    const headers = this.getAllHeaders(filteredData);
    
    // 创建 CSV 头部
    const csvHeaders = headers.map(header => this.escapeCsvValue(header)).join(',');
    
    // 创建 CSV 行
    const csvRows = filteredData.map(item => {
      return headers.map(header => {
        const value = item[header];
        return this.escapeCsvValue(this.formatCsvValue(value));
      }).join(',');
    });
    
    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * 导出为 XML 格式
   */
  private exportToXml(data: ExtractedData[], options: ExportOptions): string {
    const filteredData = this.filterFields(data, options.fields);
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<data>\n';
    
    for (const item of filteredData) {
      xml += '  <item>\n';
      for (const [key, value] of Object.entries(item)) {
        const escapedKey = this.escapeXmlTag(key);
        const escapedValue = this.escapeXmlValue(value);
        xml += `    <${escapedKey}>${escapedValue}</${escapedKey}>\n`;
      }
      xml += '  </item>\n';
    }
    
    xml += '</data>';
    return xml;
  }

  /**
   * 过滤字段
   */
  private filterFields(data: ExtractedData[], fields?: string[]): ExtractedData[] {
    if (!fields || fields.length === 0) {
      return data;
    }
    
    return data.map(item => {
      const filteredItem: ExtractedData = {};
      for (const field of fields) {
        if (field in item) {
          filteredItem[field] = item[field];
        }
      }
      return filteredItem;
    });
  }

  /**
   * 获取所有字段名
   */
  private getAllHeaders(data: ExtractedData[]): string[] {
    const headerSet = new Set<string>();
    
    for (const item of data) {
      for (const key of Object.keys(item)) {
        headerSet.add(key);
      }
    }
    
    return Array.from(headerSet).sort();
  }

  /**
   * 格式化 CSV 值
   */
  private formatCsvValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (Array.isArray(value)) {
      return value.join('; ');
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  }

  /**
   * 转义 CSV 值
   */
  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * 转义 XML 标签名
   */
  private escapeXmlTag(tag: string): string {
    return tag.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /**
   * 转义 XML 值
   */
  private escapeXmlValue(value: unknown): string {
    const str = this.formatCsvValue(value);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * 应用自定义模板
   */
  private applyTemplate(data: ExtractedData[], template: string): string {
    // 简单的模板替换实现
    // 实际项目中可能需要更复杂的模板引擎
    let result = template;
    
    // 替换数据占位符
    result = result.replace(/\{\{data\}\}/g, JSON.stringify(data, null, 2));
    
    // 替换时间戳
    result = result.replace(/\{\{timestamp\}\}/g, new Date().toISOString());
    
    // 替换记录数
    result = result.replace(/\{\{count\}\}/g, String(data.length));
    
    return result;
  }

  /**
   * 保存文件
   */
  private async saveFile(
    content: string,
    filename: string,
    mimeType: string,
  ): Promise<string> {
    // 这里应该实现实际的文件保存逻辑
    // 可能保存到本地文件系统、云存储等
    const filePath = `/tmp/exports/${filename}`;
    
    // 模拟文件保存
    this.logger.log(`保存文件: ${filePath}, MIME类型: ${mimeType}`);
    
    return filePath;
  }

  /**
   * 获取导出统计信息
   */
  getExportStats(): {
    totalExports: number;
    formatStats: Record<string, number>;
    averageFileSize: number;
  } {
    // 这里应该从数据库或缓存中获取实际统计信息
    return {
      totalExports: 0,
      formatStats: {
        json: 0,
        csv: 0,
        xml: 0,
        excel: 0,
      },
      averageFileSize: 0,
    };
  }
}