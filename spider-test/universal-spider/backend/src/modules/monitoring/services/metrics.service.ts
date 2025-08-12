import { Injectable, Logger } from '@nestjs/common';
import { SystemMetrics, ApplicationMetrics } from './monitoring.service';

export interface MetricPoint {
  name: string;
  value: number;
  timestamp: string;
  tags?: Record<string, string>;
}

export interface MetricSeries {
  name: string;
  points: MetricPoint[];
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

export interface MetricQuery {
  name?: string;
  startTime?: string;
  endTime?: string;
  tags?: Record<string, string>;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  interval?: string; // 聚合间隔，如 '1m', '5m', '1h'
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private metrics: MetricPoint[] = [];
  private maxMetrics = 100000; // 最大指标点数

  /**
   * 记录指标
   */
  recordMetric(
    name: string,
    value: number,
    tags?: Record<string, string>,
  ): void {
    const metric: MetricPoint = {
      name,
      value,
      timestamp: new Date().toISOString(),
      tags,
    };

    this.metrics.push(metric);

    // 清理旧指标
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    this.logger.debug(`记录指标: ${name} = ${value}`, tags);
  }

  /**
   * 获取系统指标
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    // 模拟获取系统指标
    const cpuUsage = this.getCpuUsage();
    const memoryInfo = this.getMemoryInfo();
    const diskInfo = this.getDiskInfo();
    const networkInfo = this.getNetworkInfo();

    const systemMetrics: SystemMetrics = {
      cpu: {
        usage: cpuUsage,
        cores: require('os').cpus().length,
      },
      memory: {
        used: memoryInfo.used,
        total: memoryInfo.total,
        percentage: (memoryInfo.used / memoryInfo.total) * 100,
      },
      disk: {
        used: diskInfo.used,
        total: diskInfo.total,
        percentage: (diskInfo.used / diskInfo.total) * 100,
      },
      network: {
        bytesIn: networkInfo.bytesIn,
        bytesOut: networkInfo.bytesOut,
      },
    };

    // 记录系统指标
    this.recordMetric('system.cpu.usage', systemMetrics.cpu.usage);
    this.recordMetric('system.memory.percentage', systemMetrics.memory.percentage);
    this.recordMetric('system.disk.percentage', systemMetrics.disk.percentage);
    this.recordMetric('system.network.bytes_in', systemMetrics.network.bytesIn);
    this.recordMetric('system.network.bytes_out', systemMetrics.network.bytesOut);

    return systemMetrics;
  }

  /**
   * 获取应用指标
   */
  async getApplicationMetrics(): Promise<ApplicationMetrics> {
    // 模拟获取应用指标
    const requestStats = this.getRequestStats();
    const crawlerStats = this.getCrawlerStats();
    const browserStats = this.getBrowserStats();

    const applicationMetrics: ApplicationMetrics = {
      requests: requestStats,
      crawler: crawlerStats,
      browser: browserStats,
    };

    // 记录应用指标
    this.recordMetric('app.requests.total', applicationMetrics.requests.total);
    this.recordMetric('app.requests.success', applicationMetrics.requests.success);
    this.recordMetric('app.requests.error', applicationMetrics.requests.error);
    this.recordMetric('app.crawler.active_tasks', applicationMetrics.crawler.activeTasks);
    this.recordMetric('app.browser.active_instances', applicationMetrics.browser.activeInstances);

    return applicationMetrics;
  }

  /**
   * 查询指标
   */
  queryMetrics(query: MetricQuery = {}): MetricSeries[] {
    let filteredMetrics = [...this.metrics];

    // 按名称过滤
    if (query.name) {
      filteredMetrics = filteredMetrics.filter((metric) => metric.name === query.name);
    }

    // 按时间范围过滤
    if (query.startTime) {
      filteredMetrics = filteredMetrics.filter(
        (metric) => metric.timestamp >= query.startTime!,
      );
    }
    if (query.endTime) {
      filteredMetrics = filteredMetrics.filter(
        (metric) => metric.timestamp <= query.endTime!,
      );
    }

    // 按标签过滤
    if (query.tags) {
      filteredMetrics = filteredMetrics.filter((metric) => {
        if (!metric.tags) return false;
        return Object.entries(query.tags!).every(
          ([key, value]) => metric.tags![key] === value,
        );
      });
    }

    // 按指标名称分组
    const groupedMetrics = this.groupMetricsByName(filteredMetrics);

    // 应用聚合
    return Object.entries(groupedMetrics).map(([name, points]) => ({
      name,
      points: query.aggregation ? this.aggregateMetrics(points, query.aggregation, query.interval) : points,
      aggregation: query.aggregation,
    }));
  }

  /**
   * 获取指标统计信息
   */
  getMetricsStats(): {
    totalMetrics: number;
    uniqueMetricNames: number;
    timeRange: { start: string; end: string } | null;
    topMetrics: { name: string; count: number }[];
  } {
    const metricNames = new Set(this.metrics.map((m) => m.name));
    const metricCounts: Record<string, number> = {};

    for (const metric of this.metrics) {
      metricCounts[metric.name] = (metricCounts[metric.name] || 0) + 1;
    }

    const topMetrics = Object.entries(metricCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    let timeRange: { start: string; end: string } | null = null;
    if (this.metrics.length > 0) {
      const timestamps = this.metrics.map((m) => m.timestamp).sort();
      timeRange = {
        start: timestamps[0],
        end: timestamps[timestamps.length - 1],
      };
    }

    return {
      totalMetrics: this.metrics.length,
      uniqueMetricNames: metricNames.size,
      timeRange,
      topMetrics,
    };
  }

  /**
   * 清理指标
   */
  clearMetrics(olderThan?: string): number {
    const initialCount = this.metrics.length;

    if (olderThan) {
      this.metrics = this.metrics.filter((metric) => metric.timestamp > olderThan);
    } else {
      this.metrics = [];
    }

    const clearedCount = initialCount - this.metrics.length;
    this.logger.log(`清理了 ${clearedCount} 个指标点`);

    return clearedCount;
  }

  /**
   * 获取CPU使用率
   */
  private getCpuUsage(): number {
    // 模拟CPU使用率
    return Math.random() * 100;
  }

  /**
   * 获取内存信息
   */
  private getMemoryInfo(): { used: number; total: number } {
    const memoryUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    
    return {
      used: memoryUsage.heapUsed,
      total: totalMemory,
    };
  }

  /**
   * 获取磁盘信息
   */
  private getDiskInfo(): { used: number; total: number } {
    // 模拟磁盘使用情况
    const total = 1000 * 1024 * 1024 * 1024; // 1TB
    const used = total * (0.3 + Math.random() * 0.4); // 30-70%
    
    return { used, total };
  }

  /**
   * 获取网络信息
   */
  private getNetworkInfo(): { bytesIn: number; bytesOut: number } {
    // 模拟网络流量
    return {
      bytesIn: Math.floor(Math.random() * 1000000),
      bytesOut: Math.floor(Math.random() * 1000000),
    };
  }

  /**
   * 获取请求统计
   */
  private getRequestStats(): {
    total: number;
    success: number;
    error: number;
    averageResponseTime: number;
  } {
    // 模拟请求统计
    const total = Math.floor(Math.random() * 10000);
    const error = Math.floor(total * 0.05); // 5% 错误率
    const success = total - error;
    
    return {
      total,
      success,
      error,
      averageResponseTime: 100 + Math.random() * 500,
    };
  }

  /**
   * 获取爬虫统计
   */
  private getCrawlerStats(): {
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageTaskTime: number;
  } {
    // 模拟爬虫统计
    return {
      activeTasks: Math.floor(Math.random() * 50),
      completedTasks: Math.floor(Math.random() * 1000),
      failedTasks: Math.floor(Math.random() * 100),
      averageTaskTime: 5000 + Math.random() * 10000,
    };
  }

  /**
   * 获取浏览器统计
   */
  private getBrowserStats(): {
    activeInstances: number;
    totalInstances: number;
    memoryUsage: number;
  } {
    // 模拟浏览器统计
    const totalInstances = 10;
    const activeInstances = Math.floor(Math.random() * totalInstances);
    
    return {
      activeInstances,
      totalInstances,
      memoryUsage: activeInstances * (100 + Math.random() * 200), // MB
    };
  }

  /**
   * 按名称分组指标
   */
  private groupMetricsByName(metrics: MetricPoint[]): Record<string, MetricPoint[]> {
    const grouped: Record<string, MetricPoint[]> = {};
    
    for (const metric of metrics) {
      if (!grouped[metric.name]) {
        grouped[metric.name] = [];
      }
      grouped[metric.name].push(metric);
    }
    
    return grouped;
  }

  /**
   * 聚合指标
   */
  private aggregateMetrics(
    metrics: MetricPoint[],
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count',
    interval?: string,
  ): MetricPoint[] {
    if (!interval) {
      // 简单聚合，不按时间间隔
      const value = this.calculateAggregation(metrics, aggregation);
      return [{
        name: metrics[0]?.name || '',
        value,
        timestamp: new Date().toISOString(),
      }];
    }

    // 按时间间隔聚合（简化实现）
    const intervalMs = this.parseInterval(interval);
    const grouped: Record<string, MetricPoint[]> = {};
    
    for (const metric of metrics) {
      const bucket = Math.floor(new Date(metric.timestamp).getTime() / intervalMs) * intervalMs;
      const bucketKey = new Date(bucket).toISOString();
      
      if (!grouped[bucketKey]) {
        grouped[bucketKey] = [];
      }
      grouped[bucketKey].push(metric);
    }
    
    return Object.entries(grouped).map(([timestamp, bucketMetrics]) => ({
      name: bucketMetrics[0]?.name || '',
      value: this.calculateAggregation(bucketMetrics, aggregation),
      timestamp,
    }));
  }

  /**
   * 计算聚合值
   */
  private calculateAggregation(
    metrics: MetricPoint[],
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count',
  ): number {
    if (metrics.length === 0) return 0;
    
    const values = metrics.map((m) => m.value);
    
    switch (aggregation) {
      case 'sum':
        return values.reduce((sum, value) => sum + value, 0);
      case 'avg':
        return values.reduce((sum, value) => sum + value, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return metrics.length;
      default:
        return 0;
    }
  }

  /**
   * 解析时间间隔
   */
  private parseInterval(interval: string): number {
    const match = interval.match(/^(\d+)([smhd])$/);
    if (!match) return 60000; // 默认1分钟
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60000;
    }
  }

  /**
   * 设置最大指标数量
   */
  setMaxMetrics(maxMetrics: number): void {
    this.maxMetrics = maxMetrics;
    
    // 如果当前指标数量超过新的限制，进行清理
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    this.logger.log(`设置最大指标数量为: ${maxMetrics}`);
  }
}