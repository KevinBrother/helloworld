import { Injectable } from '@nestjs/common';
import { WebSocketService } from './websocket.service';
import { NotificationService } from './notification.service';

export interface SpiderStatus {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'paused' | 'stopped' | 'error';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  totalPages: number;
  processedPages: number;
  errorCount: number;
  lastError?: string;
  currentUrl?: string;
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  cpu: number;
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
  timestamp: Date;
}

export interface DataProcessingStatus {
  queueSize: number;
  processing: number;
  completed: number;
  failed: number;
  averageProcessingTime: number;
  lastProcessedAt?: Date;
}

@Injectable()
export class RealTimeService {
  private spiderStatuses = new Map<string, SpiderStatus>();
  private systemMetrics: SystemMetrics[] = [];
  private dataProcessingStatus: DataProcessingStatus = {
    queueSize: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    averageProcessingTime: 0,
  };
  private metricsInterval?: NodeJS.Timeout;
  private readonly maxMetricsHistory = 100;

  constructor(
    private readonly webSocketService: WebSocketService,
    private readonly notificationService: NotificationService,
  ) {
    this.startMetricsCollection();
  }

  // Spider状态管理
  async updateSpiderStatus(spiderId: string, status: Partial<SpiderStatus>): Promise<void> {
    const currentStatus = this.spiderStatuses.get(spiderId);
    const updatedStatus: SpiderStatus = {
      id: spiderId,
      name: status.name || `Spider-${spiderId}`,
      status: status.status || 'idle',
      progress: status.progress || 0,
      totalPages: status.totalPages || 0,
      processedPages: status.processedPages || 0,
      errorCount: status.errorCount || 0,
      ...currentStatus,
      ...status,
    };

    this.spiderStatuses.set(spiderId, updatedStatus);

    // 广播状态更新
    this.webSocketService.broadcastToAll('spider-status-update', {
      spiderId,
      status: updatedStatus,
    });

    // 发送通知
    if (status.status) {
      await this.notificationService.sendSpiderStatusNotification(
        status.status,
        { spiderId, status: updatedStatus },
      );
    }
  }

  getSpiderStatus(spiderId?: string): SpiderStatus | SpiderStatus[] | undefined {
    if (spiderId) {
      return this.spiderStatuses.get(spiderId);
    }
    return Array.from(this.spiderStatuses.values());
  }

  async removeSpiderStatus(spiderId: string): Promise<void> {
    this.spiderStatuses.delete(spiderId);
    this.webSocketService.broadcastToAll('spider-removed', { spiderId });
  }

  // 系统指标管理
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 5000); // 每5秒收集一次指标
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      const metrics: SystemMetrics = {
        cpu: await this.getCpuUsage(),
        memory: this.getMemoryUsage(),
        disk: await this.getDiskUsage(),
        network: await this.getNetworkUsage(),
        timestamp: new Date(),
      };

      this.systemMetrics.push(metrics);
      
      // 保持历史记录在限制范围内
      if (this.systemMetrics.length > this.maxMetricsHistory) {
        this.systemMetrics.shift();
      }

      // 广播指标更新
      this.webSocketService.broadcastToRoom('monitoring', 'system-metrics-update', metrics);

      // 检查告警条件
      await this.checkMetricsAlerts(metrics);
    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  private async getCpuUsage(): Promise<number> {
    // 简化的CPU使用率计算
    return Math.random() * 100; // 实际实现需要使用系统API
  }

  private getMemoryUsage(): SystemMetrics['memory'] {
    const memoryUsage = process.memoryUsage();
    const totalMemory = 8 * 1024 * 1024 * 1024; // 假设8GB内存
    const usedMemory = memoryUsage.heapUsed + memoryUsage.external;
    
    return {
      used: usedMemory,
      total: totalMemory,
      percentage: (usedMemory / totalMemory) * 100,
    };
  }

  private async getDiskUsage(): Promise<SystemMetrics['disk']> {
    // 简化的磁盘使用率计算
    const totalDisk = 500 * 1024 * 1024 * 1024; // 假设500GB磁盘
    const usedDisk = Math.random() * totalDisk;
    
    return {
      used: usedDisk,
      total: totalDisk,
      percentage: (usedDisk / totalDisk) * 100,
    };
  }

  private async getNetworkUsage(): Promise<SystemMetrics['network']> {
    // 简化的网络使用率计算
    return {
      bytesIn: Math.random() * 1000000,
      bytesOut: Math.random() * 1000000,
    };
  }

  private async checkMetricsAlerts(metrics: SystemMetrics): Promise<void> {
    // CPU告警
    if (metrics.cpu > 90) {
      await this.notificationService.sendSystemNotification(
        `High CPU usage detected: ${metrics.cpu.toFixed(2)}%`,
        'high',
        { metrics },
      );
    }

    // 内存告警
    if (metrics.memory.percentage > 85) {
      await this.notificationService.sendSystemNotification(
        `High memory usage detected: ${metrics.memory.percentage.toFixed(2)}%`,
        'high',
        { metrics },
      );
    }

    // 磁盘告警
    if (metrics.disk.percentage > 90) {
      await this.notificationService.sendSystemNotification(
        `High disk usage detected: ${metrics.disk.percentage.toFixed(2)}%`,
        'urgent',
        { metrics },
      );
    }
  }

  getSystemMetrics(limit?: number): SystemMetrics[] {
    const metrics = this.systemMetrics.slice();
    if (limit) {
      return metrics.slice(-limit);
    }
    return metrics;
  }

  getLatestSystemMetrics(): SystemMetrics | undefined {
    return this.systemMetrics[this.systemMetrics.length - 1];
  }

  // 数据处理状态管理
  async updateDataProcessingStatus(status: Partial<DataProcessingStatus>): Promise<void> {
    this.dataProcessingStatus = {
      ...this.dataProcessingStatus,
      ...status,
      lastProcessedAt: new Date(),
    };

    this.webSocketService.broadcastToRoom('data-processing', 'data-processing-update', this.dataProcessingStatus);

    await this.notificationService.sendDataProcessingNotification(
      'Data processing status updated',
      this.dataProcessingStatus as unknown as Record<string, unknown>,
    );
  }

  getDataProcessingStatus(): DataProcessingStatus {
    return { ...this.dataProcessingStatus };
  }

  // 实时事件广播
  async broadcastEvent(event: string, data: any, room?: string): Promise<void> {
    if (room) {
      this.webSocketService.broadcastToRoom(room, event, data);
    } else {
      this.webSocketService.broadcastToAll(event, data);
    }
  }

  async sendEventToClient(clientId: string, event: string, data: any): Promise<boolean> {
    return this.webSocketService.sendToClient(clientId, event, data);
  }

  // 清理和停止
  stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
  }

  clearMetricsHistory(): void {
    this.systemMetrics = [];
  }

  clearSpiderStatuses(): void {
    this.spiderStatuses.clear();
    this.webSocketService.broadcastToAll('all-spiders-cleared', {});
  }

  // 获取实时统计信息
  getRealTimeStats(): {
    activeSpiders: number;
    totalConnections: number;
    systemHealth: 'good' | 'warning' | 'critical';
    dataProcessing: DataProcessingStatus;
  } {
    const activeSpiders = Array.from(this.spiderStatuses.values())
      .filter(spider => spider.status === 'running').length;
    
    const connectionStats = this.webSocketService.getConnectionStats();
    const latestMetrics = this.getLatestSystemMetrics();
    
    let systemHealth: 'good' | 'warning' | 'critical' = 'good';
    if (latestMetrics) {
      if (latestMetrics.cpu > 90 || latestMetrics.memory.percentage > 90 || latestMetrics.disk.percentage > 95) {
        systemHealth = 'critical';
      } else if (latestMetrics.cpu > 70 || latestMetrics.memory.percentage > 75 || latestMetrics.disk.percentage > 85) {
        systemHealth = 'warning';
      }
    }

    return {
      activeSpiders,
      totalConnections: connectionStats.activeConnections,
      systemHealth,
      dataProcessing: this.dataProcessingStatus,
    };
  }
}