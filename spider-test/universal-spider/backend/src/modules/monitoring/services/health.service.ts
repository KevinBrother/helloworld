import { Injectable, Logger } from '@nestjs/common';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  message?: string;
  lastChecked: string;
  responseTime?: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, boolean>;
  timestamp: string;
  uptime: number;
  version?: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private healthChecks: Map<string, HealthCheck> = new Map();
  private checkInterval?: NodeJS.Timeout;
  private isRunning = false;

  constructor() {
    this.initializeDefaultChecks();
  }

  /**
   * 启动健康检查
   */
  startHealthChecks(): void {
    if (this.isRunning) {
      this.logger.warn('健康检查已经在运行中');
      return;
    }

    this.logger.log('启动健康检查');
    this.isRunning = true;

    // 每30秒执行一次健康检查
    this.checkInterval = setInterval(() => {
      this.runAllHealthChecks();
    }, 30000);

    // 立即执行一次检查
    this.runAllHealthChecks();
  }

  /**
   * 停止健康检查
   */
  stopHealthChecks(): void {
    if (!this.isRunning) {
      this.logger.warn('健康检查未在运行');
      return;
    }

    this.logger.log('停止健康检查');
    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  /**
   * 获取健康状态
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const checks: Record<string, boolean> = {};
    let healthyCount = 0;
    let totalCount = 0;

    for (const [name, check] of this.healthChecks) {
      checks[name] = check.status === 'healthy';
      if (check.status === 'healthy') {
        healthyCount++;
      }
      totalCount++;
    }

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalCount) {
      overallStatus = 'healthy';
    } else if (healthyCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    return {
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * 获取详细的健康检查结果
   */
  getDetailedHealthChecks(): HealthCheck[] {
    return Array.from(this.healthChecks.values());
  }

  /**
   * 添加自定义健康检查
   */
  addHealthCheck(
    name: string,
    checkFunction: () => Promise<{ status: 'healthy' | 'unhealthy'; message?: string }>,
  ): void {
    this.logger.log(`添加健康检查: ${name}`);
    
    // 立即执行一次检查
    this.executeHealthCheck(name, checkFunction);
  }

  /**
   * 移除健康检查
   */
  removeHealthCheck(name: string): boolean {
    if (this.healthChecks.has(name)) {
      this.healthChecks.delete(name);
      this.logger.log(`移除健康检查: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * 执行所有健康检查
   */
  private async runAllHealthChecks(): Promise<void> {
    this.logger.debug('执行所有健康检查');

    const checks = [
      { name: 'database', fn: this.checkDatabase },
      { name: 'memory', fn: this.checkMemory },
      { name: 'disk', fn: this.checkDisk },
      { name: 'browser_pool', fn: this.checkBrowserPool },
    ];

    for (const check of checks) {
      try {
        await this.executeHealthCheck(check.name, check.fn.bind(this));
      } catch (error) {
        this.logger.error(`健康检查失败: ${check.name}`, error);
        this.updateHealthCheck(check.name, {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * 执行单个健康检查
   */
  private async executeHealthCheck(
    name: string,
    checkFunction: () => Promise<{ status: 'healthy' | 'unhealthy'; message?: string }>,
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      const result = await checkFunction();
      const responseTime = Date.now() - startTime;
      
      this.updateHealthCheck(name, {
        status: result.status,
        message: result.message,
        responseTime,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.updateHealthCheck(name, {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : String(error),
        responseTime,
      });
    }
  }

  /**
   * 更新健康检查结果
   */
  private updateHealthCheck(
    name: string,
    update: {
      status: 'healthy' | 'unhealthy';
      message?: string;
      responseTime?: number;
    },
  ): void {
    const existing = this.healthChecks.get(name);
    const healthCheck: HealthCheck = {
      name,
      status: update.status,
      message: update.message,
      lastChecked: new Date().toISOString(),
      responseTime: update.responseTime,
    };

    this.healthChecks.set(name, healthCheck);

    if (existing?.status !== update.status) {
      this.logger.log(
        `健康检查状态变更: ${name} ${existing?.status || 'unknown'} -> ${update.status}`,
      );
    }
  }

  /**
   * 检查数据库连接
   */
  private async checkDatabase(): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }> {
    try {
      // 这里应该实现实际的数据库连接检查
      // 模拟数据库检查
      await new Promise((resolve) => setTimeout(resolve, 10));
      
      return {
        status: 'healthy',
        message: '数据库连接正常',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `数据库连接失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 检查内存使用情况
   */
  private async checkMemory(): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }> {
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
      const usagePercentage = (heapUsedMB / heapTotalMB) * 100;

      if (usagePercentage > 90) {
        return {
          status: 'unhealthy',
          message: `内存使用率过高: ${usagePercentage.toFixed(2)}%`,
        };
      }

      return {
        status: 'healthy',
        message: `内存使用正常: ${usagePercentage.toFixed(2)}%`,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `内存检查失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 检查磁盘空间
   */
  private async checkDisk(): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }> {
    try {
      // 模拟磁盘空间检查
      const diskUsagePercentage = Math.random() * 100;

      if (diskUsagePercentage > 95) {
        return {
          status: 'unhealthy',
          message: `磁盘空间不足: ${diskUsagePercentage.toFixed(2)}%`,
        };
      }

      return {
        status: 'healthy',
        message: `磁盘空间充足: ${diskUsagePercentage.toFixed(2)}%`,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `磁盘检查失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 检查浏览器池状态
   */
  private async checkBrowserPool(): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }> {
    try {
      // 这里应该检查实际的浏览器池状态
      // 模拟浏览器池检查
      const activeBrowsers = Math.floor(Math.random() * 10);
      const maxBrowsers = 10;

      if (activeBrowsers === 0) {
        return {
          status: 'unhealthy',
          message: '没有可用的浏览器实例',
        };
      }

      return {
        status: 'healthy',
        message: `浏览器池正常: ${activeBrowsers}/${maxBrowsers} 实例活跃`,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `浏览器池检查失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 初始化默认健康检查
   */
  private initializeDefaultChecks(): void {
    // 初始化默认的健康检查项
    const defaultChecks = ['database', 'memory', 'disk', 'browser_pool'];
    
    for (const checkName of defaultChecks) {
      this.healthChecks.set(checkName, {
        name: checkName,
        status: 'unhealthy',
        message: '尚未检查',
        lastChecked: new Date().toISOString(),
      });
    }
  }

  /**
   * 获取健康服务状态
   */
  getServiceStatus(): {
    isRunning: boolean;
    checksCount: number;
    lastCheckTime: string | null;
  } {
    let lastCheckTime: string | null = null;
    
    for (const check of this.healthChecks.values()) {
      if (!lastCheckTime || check.lastChecked > lastCheckTime) {
        lastCheckTime = check.lastChecked;
      }
    }

    return {
      isRunning: this.isRunning,
      checksCount: this.healthChecks.size,
      lastCheckTime,
    };
  }
}