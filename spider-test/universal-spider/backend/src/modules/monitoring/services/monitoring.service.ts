import { Injectable, Logger } from '@nestjs/common';
import { LoggingService } from './logging.service';
import { MetricsService } from './metrics.service';
import { HealthService } from './health.service';

export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
}

export interface ApplicationMetrics {
  requests: {
    total: number;
    success: number;
    error: number;
    averageResponseTime: number;
  };
  crawler: {
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageTaskTime: number;
  };
  browser: {
    activeInstances: number;
    totalInstances: number;
    memoryUsage: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: '>' | '<' | '=' | '>=' | '<=';
  threshold: number;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Alert {
  id: string;
  ruleId: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(
    private readonly loggingService: LoggingService,
    private readonly metricsService: MetricsService,
    private readonly healthService: HealthService,
  ) {
    this.initializeDefaultAlertRules();
  }

  /**
   * 启动监控
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      this.logger.warn('监控已经在运行中');
      return;
    }

    this.logger.log('启动系统监控');
    this.isMonitoring = true;

    // 每30秒检查一次系统指标
    this.monitoringInterval = setInterval(() => {
      this.checkSystemHealth();
    }, 30000);

    this.loggingService.logEvent('monitoring', 'started', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      this.logger.warn('监控未在运行');
      return;
    }

    this.logger.log('停止系统监控');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.loggingService.logEvent('monitoring', 'stopped', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 获取系统指标
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    return this.metricsService.getSystemMetrics();
  }

  /**
   * 获取应用指标
   */
  async getApplicationMetrics(): Promise<ApplicationMetrics> {
    return this.metricsService.getApplicationMetrics();
  }

  /**
   * 获取健康状态
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    timestamp: string;
  }> {
    return this.healthService.getHealthStatus();
  }

  /**
   * 添加告警规则
   */
  addAlertRule(rule: Omit<AlertRule, 'id'>): AlertRule {
    const alertRule: AlertRule = {
      ...rule,
      id: this.generateId(),
    };

    this.alertRules.push(alertRule);
    this.logger.log(`添加告警规则: ${alertRule.name}`);

    return alertRule;
  }

  /**
   * 删除告警规则
   */
  removeAlertRule(ruleId: string): boolean {
    const index = this.alertRules.findIndex((rule) => rule.id === ruleId);
    if (index === -1) {
      return false;
    }

    const rule = this.alertRules[index];
    this.alertRules.splice(index, 1);
    this.logger.log(`删除告警规则: ${rule.name}`);

    return true;
  }

  /**
   * 获取所有告警规则
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter((alert) => !alert.resolved);
  }

  /**
   * 获取所有告警
   */
  getAllAlerts(): Alert[] {
    return [...this.alerts];
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();

    this.logger.log(`告警已解决: ${alert.message}`);
    this.loggingService.logEvent('alert', 'resolved', {
      alertId,
      message: alert.message,
      timestamp: alert.resolvedAt,
    });

    return true;
  }

  /**
   * 记录自定义事件
   */
  logEvent(category: string, action: string, data?: Record<string, unknown>): void {
    this.loggingService.logEvent(category, action, data);
  }

  /**
   * 记录性能指标
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    this.metricsService.recordMetric(name, value, tags);
  }

  /**
   * 检查系统健康状态
   */
  private async checkSystemHealth(): Promise<void> {
    try {
      const systemMetrics = await this.getSystemMetrics();
      const applicationMetrics = await this.getApplicationMetrics();

      // 检查告警规则
      this.checkAlertRules(systemMetrics, applicationMetrics);
    } catch (error) {
      this.logger.error('检查系统健康状态失败:', error);
    }
  }

  /**
   * 检查告警规则
   */
  private checkAlertRules(
    systemMetrics: SystemMetrics,
    applicationMetrics: ApplicationMetrics,
  ): void {
    for (const rule of this.alertRules) {
      if (!rule.enabled) {
        continue;
      }

      const value = this.getMetricValue(rule.metric, systemMetrics, applicationMetrics);
      if (value === null) {
        continue;
      }

      const triggered = this.evaluateRule(rule, value);
      if (triggered) {
        this.triggerAlert(rule, value);
      }
    }
  }

  /**
   * 获取指标值
   */
  private getMetricValue(
    metric: string,
    systemMetrics: SystemMetrics,
    applicationMetrics: ApplicationMetrics,
  ): number | null {
    const parts = metric.split('.');
    let value: unknown = { system: systemMetrics, app: applicationMetrics };

    for (const part of parts) {
      if (typeof value === 'object' && value !== null && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return null;
      }
    }

    return typeof value === 'number' ? value : null;
  }

  /**
   * 评估告警规则
   */
  private evaluateRule(rule: AlertRule, value: number): boolean {
    switch (rule.operator) {
      case '>':
        return value > rule.threshold;
      case '<':
        return value < rule.threshold;
      case '=':
        return value === rule.threshold;
      case '>=':
        return value >= rule.threshold;
      case '<=':
        return value <= rule.threshold;
      default:
        return false;
    }
  }

  /**
   * 触发告警
   */
  private triggerAlert(rule: AlertRule, value: number): void {
    // 检查是否已有相同的活跃告警
    const existingAlert = this.alerts.find(
      (alert) => alert.ruleId === rule.id && !alert.resolved,
    );

    if (existingAlert) {
      return; // 避免重复告警
    }

    const alert: Alert = {
      id: this.generateId(),
      ruleId: rule.id,
      message: `${rule.name}: ${rule.metric} ${rule.operator} ${rule.threshold} (当前值: ${value})`,
      severity: rule.severity,
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    this.alerts.push(alert);
    this.logger.warn(`触发告警: ${alert.message}`);

    this.loggingService.logEvent('alert', 'triggered', {
      alertId: alert.id,
      ruleId: rule.id,
      message: alert.message,
      severity: alert.severity,
      timestamp: alert.timestamp,
    });
  }

  /**
   * 初始化默认告警规则
   */
  private initializeDefaultAlertRules(): void {
    const defaultRules: Omit<AlertRule, 'id'>[] = [
      {
        name: 'CPU使用率过高',
        metric: 'system.cpu.usage',
        operator: '>',
        threshold: 80,
        enabled: true,
        severity: 'high',
      },
      {
        name: '内存使用率过高',
        metric: 'system.memory.percentage',
        operator: '>',
        threshold: 85,
        enabled: true,
        severity: 'high',
      },
      {
        name: '磁盘使用率过高',
        metric: 'system.disk.percentage',
        operator: '>',
        threshold: 90,
        enabled: true,
        severity: 'medium',
      },
      {
        name: '错误率过高',
        metric: 'app.requests.error',
        operator: '>',
        threshold: 100,
        enabled: true,
        severity: 'critical',
      },
    ];

    for (const rule of defaultRules) {
      this.addAlertRule(rule);
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * 获取监控状态
   */
  getMonitoringStatus(): {
    isRunning: boolean;
    uptime: number;
    alertRulesCount: number;
    activeAlertsCount: number;
  } {
    return {
      isRunning: this.isMonitoring,
      uptime: process.uptime(),
      alertRulesCount: this.alertRules.length,
      activeAlertsCount: this.getActiveAlerts().length,
    };
  }
}