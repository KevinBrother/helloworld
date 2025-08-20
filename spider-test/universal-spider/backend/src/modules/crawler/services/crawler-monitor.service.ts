import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataStorageService } from '../../data/services/data-storage.service';

export interface CrawlerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  errorRate: number;
  successRate: number;
  dataQualityScore: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  queueSize: number;
  lastUpdated: Date;
}

export interface CrawlerAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  details: any;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export enum AlertType {
  HIGH_ERROR_RATE = 'high_error_rate',
  SLOW_RESPONSE = 'slow_response',
  MEMORY_USAGE = 'memory_usage',
  CPU_USAGE = 'cpu_usage',
  QUEUE_OVERFLOW = 'queue_overflow',
  CONNECTION_LIMIT = 'connection_limit',
  DATA_QUALITY = 'data_quality',
  RATE_LIMIT = 'rate_limit',
  SYSTEM_ERROR = 'system_error',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsInterval: number; // 指标收集间隔（毫秒）
  alertThresholds: {
    errorRate: number; // 错误率阈值（百分比）
    responseTime: number; // 响应时间阈值（毫秒）
    memoryUsage: number; // 内存使用率阈值（百分比）
    cpuUsage: number; // CPU使用率阈值（百分比）
    queueSize: number; // 队列大小阈值
    dataQualityScore: number; // 数据质量分数阈值
  };
  retentionPeriod: number; // 数据保留期（天）
  notifications: {
    email: boolean;
    webhook: boolean;
    slack: boolean;
  };
}

export interface PerformanceReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    peakRequestsPerMinute: number;
    totalDataExtracted: number;
    averageDataQuality: number;
  };
  trends: {
    requestVolume: Array<{ timestamp: Date; count: number }>;
    responseTime: Array<{ timestamp: Date; average: number }>;
    errorRate: Array<{ timestamp: Date; rate: number }>;
    dataQuality: Array<{ timestamp: Date; score: number }>;
  };
  topErrors: Array<{ error: string; count: number; percentage: number }>;
  slowestUrls: Array<{ url: string; averageTime: number; count: number }>;
  recommendations: string[];
}

@Injectable()
export class CrawlerMonitorService {
  private readonly logger = new Logger(CrawlerMonitorService.name);
  private metrics: CrawlerMetrics;
  private alerts: Map<string, CrawlerAlert> = new Map();
  private config: MonitoringConfig;
  private metricsHistory: Array<{ timestamp: Date; metrics: CrawlerMetrics }> = [];
  private monitoringInterval?: NodeJS.Timeout;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly dataStorage: DataStorageService,
  ) {
    this.initializeMetrics();
    this.initializeConfig();
    this.startMonitoring();
  }

  /**
   * 获取当前指标
   */
  getCurrentMetrics(): CrawlerMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取历史指标
   */
  getMetricsHistory(hours: number = 24): Array<{ timestamp: Date; metrics: CrawlerMetrics }> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metricsHistory.filter(entry => entry.timestamp >= cutoff);
  }

  /**
   * 记录请求
   */
  recordRequest(success: boolean, responseTime: number, dataQuality?: number): void {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    // 更新平均响应时间
    this.updateAverageResponseTime(responseTime);
    
    // 更新数据质量分数
    if (dataQuality !== undefined) {
      this.updateDataQualityScore(dataQuality);
    }
    
    // 更新速率
    this.updateRequestRates();
    
    // 更新成功率和错误率
    this.updateRates();
    
    this.metrics.lastUpdated = new Date();
    
    // 检查告警条件
    this.checkAlerts();
    
    // 发送事件
    this.eventEmitter.emit('crawler.request.recorded', {
      success,
      responseTime,
      dataQuality,
      metrics: this.metrics,
    });
  }

  /**
   * 记录错误
   */
  recordError(error: Error, url?: string, context?: any): void {
    this.logger.error('爬虫错误', { error: error.message, url, context });
    
    // 创建错误告警
    this.createAlert({
      type: AlertType.SYSTEM_ERROR,
      severity: AlertSeverity.MEDIUM,
      message: `爬虫错误: ${error.message}`,
      details: { error: error.message, url, context, stack: error.stack },
    });
    
    // 发送事件
    this.eventEmitter.emit('crawler.error.recorded', {
      error,
      url,
      context,
    });
  }

  /**
   * 更新系统资源使用情况
   */
  updateSystemMetrics(memoryUsage: number, cpuUsage: number, activeConnections: number, queueSize: number): void {
    this.metrics.memoryUsage = memoryUsage;
    this.metrics.cpuUsage = cpuUsage;
    this.metrics.activeConnections = activeConnections;
    this.metrics.queueSize = queueSize;
    this.metrics.lastUpdated = new Date();
    
    // 检查系统资源告警
    this.checkSystemAlerts();
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): CrawlerAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * 获取所有告警
   */
  getAllAlerts(limit: number = 100): CrawlerAlert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      this.logger.log(`告警已解决: ${alert.message} (${alertId})`);
      
      // 发送事件
      this.eventEmitter.emit('crawler.alert.resolved', alert);
      
      return true;
    }
    return false;
  }

  /**
   * 生成性能报告
   */
  async generatePerformanceReport(startDate: Date, endDate: Date): Promise<PerformanceReport> {
    const historyInPeriod = this.metricsHistory.filter(
      entry => entry.timestamp >= startDate && entry.timestamp <= endDate
    );
    
    if (historyInPeriod.length === 0) {
      throw new Error('指定时间段内没有数据');
    }
    
    const summary = this.calculateSummary(historyInPeriod);
    const trends = this.calculateTrends(historyInPeriod);
    const topErrors = await this.getTopErrors(startDate, endDate);
    const slowestUrls = await this.getSlowestUrls(startDate, endDate);
    const recommendations = this.generateRecommendations(summary, trends);
    
    return {
      period: { start: startDate, end: endDate },
      summary,
      trends,
      topErrors,
      slowestUrls,
      recommendations,
    };
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.initializeMetrics();
    this.logger.log('监控指标已重置');
  }

  /**
   * 更新监控配置
   */
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 重启监控
    this.stopMonitoring();
    this.startMonitoring();
    
    this.logger.log('监控配置已更新');
  }

  /**
   * 获取监控配置
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * 初始化指标
   */
  private initializeMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestsPerMinute: 0,
      requestsPerHour: 0,
      errorRate: 0,
      successRate: 0,
      dataQualityScore: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      activeConnections: 0,
      queueSize: 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * 初始化配置
   */
  private initializeConfig(): void {
    this.config = {
      enabled: true,
      metricsInterval: 60000, // 1分钟
      alertThresholds: {
        errorRate: 10, // 10%
        responseTime: 10000, // 10秒
        memoryUsage: 80, // 80%
        cpuUsage: 80, // 80%
        queueSize: 1000,
        dataQualityScore: 60,
      },
      retentionPeriod: 30, // 30天
      notifications: {
        email: false,
        webhook: false,
        slack: false,
      },
    };
  }

  /**
   * 开始监控
   */
  private startMonitoring(): void {
    if (!this.config.enabled) {
      return;
    }
    
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsInterval);
    
    this.logger.log('爬虫监控已启动');
  }

  /**
   * 停止监控
   */
  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.logger.log('爬虫监控已停止');
  }

  /**
   * 收集指标
   */
  private collectMetrics(): void {
    // 保存当前指标到历史记录
    this.metricsHistory.push({
      timestamp: new Date(),
      metrics: { ...this.metrics },
    });
    
    // 清理过期数据
    this.cleanupOldMetrics();
    
    // 发送事件
    this.eventEmitter.emit('crawler.metrics.collected', this.metrics);
  }

  /**
   * 清理过期指标
   */
  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - this.config.retentionPeriod * 24 * 60 * 60 * 1000);
    this.metricsHistory = this.metricsHistory.filter(entry => entry.timestamp >= cutoff);
  }

  /**
   * 更新平均响应时间
   */
  private updateAverageResponseTime(responseTime: number): void {
    if (this.metrics.totalRequests === 1) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
        this.metrics.totalRequests;
    }
  }

  /**
   * 更新数据质量分数
   */
  private updateDataQualityScore(dataQuality: number): void {
    if (this.metrics.dataQualityScore === 0) {
      this.metrics.dataQualityScore = dataQuality;
    } else {
      this.metrics.dataQualityScore = 
        (this.metrics.dataQualityScore + dataQuality) / 2;
    }
  }

  /**
   * 更新请求速率
   */
  private updateRequestRates(): void {
    // 简化实现，实际应该基于时间窗口计算
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const oneHourAgo = new Date(now.getTime() - 3600000);
    
    const recentMetrics = this.metricsHistory.filter(
      entry => entry.timestamp >= oneMinuteAgo
    );
    
    const hourlyMetrics = this.metricsHistory.filter(
      entry => entry.timestamp >= oneHourAgo
    );
    
    this.metrics.requestsPerMinute = recentMetrics.length;
    this.metrics.requestsPerHour = hourlyMetrics.length;
  }

  /**
   * 更新成功率和错误率
   */
  private updateRates(): void {
    if (this.metrics.totalRequests > 0) {
      this.metrics.successRate = 
        (this.metrics.successfulRequests / this.metrics.totalRequests) * 100;
      this.metrics.errorRate = 
        (this.metrics.failedRequests / this.metrics.totalRequests) * 100;
    }
  }

  /**
   * 检查告警条件
   */
  private checkAlerts(): void {
    const thresholds = this.config.alertThresholds;
    
    // 检查错误率
    if (this.metrics.errorRate > thresholds.errorRate) {
      this.createAlert({
        type: AlertType.HIGH_ERROR_RATE,
        severity: AlertSeverity.HIGH,
        message: `错误率过高: ${this.metrics.errorRate.toFixed(2)}%`,
        details: { errorRate: this.metrics.errorRate, threshold: thresholds.errorRate },
      });
    }
    
    // 检查响应时间
    if (this.metrics.averageResponseTime > thresholds.responseTime) {
      this.createAlert({
        type: AlertType.SLOW_RESPONSE,
        severity: AlertSeverity.MEDIUM,
        message: `响应时间过慢: ${this.metrics.averageResponseTime.toFixed(0)}ms`,
        details: { responseTime: this.metrics.averageResponseTime, threshold: thresholds.responseTime },
      });
    }
    
    // 检查数据质量
    if (this.metrics.dataQualityScore < thresholds.dataQualityScore) {
      this.createAlert({
        type: AlertType.DATA_QUALITY,
        severity: AlertSeverity.MEDIUM,
        message: `数据质量过低: ${this.metrics.dataQualityScore.toFixed(2)}`,
        details: { dataQualityScore: this.metrics.dataQualityScore, threshold: thresholds.dataQualityScore },
      });
    }
  }

  /**
   * 检查系统资源告警
   */
  private checkSystemAlerts(): void {
    const thresholds = this.config.alertThresholds;
    
    // 检查内存使用率
    if (this.metrics.memoryUsage > thresholds.memoryUsage) {
      this.createAlert({
        type: AlertType.MEMORY_USAGE,
        severity: AlertSeverity.HIGH,
        message: `内存使用率过高: ${this.metrics.memoryUsage.toFixed(2)}%`,
        details: { memoryUsage: this.metrics.memoryUsage, threshold: thresholds.memoryUsage },
      });
    }
    
    // 检查CPU使用率
    if (this.metrics.cpuUsage > thresholds.cpuUsage) {
      this.createAlert({
        type: AlertType.CPU_USAGE,
        severity: AlertSeverity.HIGH,
        message: `CPU使用率过高: ${this.metrics.cpuUsage.toFixed(2)}%`,
        details: { cpuUsage: this.metrics.cpuUsage, threshold: thresholds.cpuUsage },
      });
    }
    
    // 检查队列大小
    if (this.metrics.queueSize > thresholds.queueSize) {
      this.createAlert({
        type: AlertType.QUEUE_OVERFLOW,
        severity: AlertSeverity.MEDIUM,
        message: `队列大小过大: ${this.metrics.queueSize}`,
        details: { queueSize: this.metrics.queueSize, threshold: thresholds.queueSize },
      });
    }
  }

  /**
   * 创建告警
   */
  private createAlert(alertData: {
    type: AlertType;
    severity: AlertSeverity;
    message: string;
    details: any;
  }): void {
    const alert: CrawlerAlert = {
      id: this.generateAlertId(),
      ...alertData,
      timestamp: new Date(),
      resolved: false,
    };
    
    this.alerts.set(alert.id, alert);
    
    this.logger.warn(`新告警: ${alert.message}`, alert.details);
    
    // 发送事件
    this.eventEmitter.emit('crawler.alert.created', alert);
  }

  /**
   * 生成告警ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 计算摘要统计
   */
  private calculateSummary(history: Array<{ timestamp: Date; metrics: CrawlerMetrics }>): PerformanceReport['summary'] {
    if (history.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        peakRequestsPerMinute: 0,
        totalDataExtracted: 0,
        averageDataQuality: 0,
      };
    }
    
    const latest = history[history.length - 1].metrics;
    const peakRequestsPerMinute = Math.max(...history.map(h => h.metrics.requestsPerMinute));
    const averageDataQuality = history.reduce((sum, h) => sum + h.metrics.dataQualityScore, 0) / history.length;
    
    return {
      totalRequests: latest.totalRequests,
      successRate: latest.successRate,
      averageResponseTime: latest.averageResponseTime,
      peakRequestsPerMinute,
      totalDataExtracted: latest.successfulRequests,
      averageDataQuality,
    };
  }

  /**
   * 计算趋势数据
   */
  private calculateTrends(history: Array<{ timestamp: Date; metrics: CrawlerMetrics }>): PerformanceReport['trends'] {
    return {
      requestVolume: history.map(h => ({
        timestamp: h.timestamp,
        count: h.metrics.requestsPerMinute,
      })),
      responseTime: history.map(h => ({
        timestamp: h.timestamp,
        average: h.metrics.averageResponseTime,
      })),
      errorRate: history.map(h => ({
        timestamp: h.timestamp,
        rate: h.metrics.errorRate,
      })),
      dataQuality: history.map(h => ({
        timestamp: h.timestamp,
        score: h.metrics.dataQualityScore,
      })),
    };
  }

  /**
   * 获取最常见错误
   */
  private async getTopErrors(startDate: Date, endDate: Date): Promise<Array<{ error: string; count: number; percentage: number }>> {
    // 这里应该从数据库查询错误统计
    // 简化实现，返回模拟数据
    return [
      { error: '连接超时', count: 25, percentage: 45.5 },
      { error: '404 Not Found', count: 15, percentage: 27.3 },
      { error: '解析错误', count: 10, percentage: 18.2 },
      { error: '其他错误', count: 5, percentage: 9.0 },
    ];
  }

  /**
   * 获取最慢的URL
   */
  private async getSlowestUrls(startDate: Date, endDate: Date): Promise<Array<{ url: string; averageTime: number; count: number }>> {
    // 这里应该从数据库查询URL性能统计
    // 简化实现，返回模拟数据
    return [
      { url: 'https://example.com/slow-page', averageTime: 8500, count: 12 },
      { url: 'https://example.com/heavy-content', averageTime: 7200, count: 8 },
      { url: 'https://example.com/dynamic-page', averageTime: 6800, count: 15 },
    ];
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(summary: PerformanceReport['summary'], trends: PerformanceReport['trends']): string[] {
    const recommendations: string[] = [];
    
    if (summary.successRate < 90) {
      recommendations.push('成功率较低，建议检查网络连接和目标网站状态');
    }
    
    if (summary.averageResponseTime > 5000) {
      recommendations.push('响应时间较慢，建议优化网络配置或增加并发限制');
    }
    
    if (summary.averageDataQuality < 70) {
      recommendations.push('数据质量较低，建议优化数据提取规则和验证逻辑');
    }
    
    if (summary.peakRequestsPerMinute > 100) {
      recommendations.push('请求频率较高，建议检查是否遵守目标网站的robots.txt和速率限制');
    }
    
    return recommendations;
  }
}