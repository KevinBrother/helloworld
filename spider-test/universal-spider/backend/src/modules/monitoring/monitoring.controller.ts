import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { MonitoringService, AlertRule } from './services/monitoring.service';
import { LoggingService, LogQuery } from './services/logging.service';
import { MetricsService, MetricQuery } from './services/metrics.service';
import { HealthService } from './services/health.service';

export interface AddAlertRuleDto {
  name: string;
  metric: string;
  operator: '>' | '<' | '=' | '>=' | '<=';
  threshold: number;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

@Controller('monitoring')
export class MonitoringController {
  private readonly logger = new Logger(MonitoringController.name);

  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly loggingService: LoggingService,
    private readonly metricsService: MetricsService,
    private readonly healthService: HealthService,
  ) {}

  /**
   * 获取系统统计信息
   */
  @Get('system')
  async getSystemStats() {
    try {
      const systemStats = {
        cpu: {
          usage: Math.round(Math.random() * 100),
          cores: 8,
        },
        memory: {
          used: Math.round(Math.random() * 8 * 1024 * 1024 * 1024),
          total: 8 * 1024 * 1024 * 1024,
          usage: Math.round(Math.random() * 100),
        },
        disk: {
          used: Math.round(Math.random() * 500 * 1024 * 1024 * 1024),
          total: 500 * 1024 * 1024 * 1024,
          usage: Math.round(Math.random() * 100),
        },
        network: {
          bytesIn: Math.round(Math.random() * 1000000),
          bytesOut: Math.round(Math.random() * 1000000),
        },
      };
      return {
        success: true,
        data: systemStats,
      };
    } catch (error) {
      this.logger.error('获取系统统计信息失败:', error);
      throw new HttpException(
        '获取系统统计信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取任务统计信息
   */
  @Get('tasks')
  async getTaskStats() {
    try {
      const taskStats = {
        total: Math.round(Math.random() * 1000),
        pending: Math.round(Math.random() * 50),
        running: Math.round(Math.random() * 20),
        completed: Math.round(Math.random() * 800),
        failed: Math.round(Math.random() * 100),
        cancelled: Math.round(Math.random() * 30),
      };
      return {
        success: true,
        data: taskStats,
      };
    } catch (error) {
      this.logger.error('获取任务统计信息失败:', error);
      throw new HttpException(
        '获取任务统计信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取性能指标
   */
  @Get('performance')
  async getPerformanceMetrics() {
    try {
      const performanceMetrics = {
        timestamp: new Date().toISOString(),
        responseTime: Math.round(Math.random() * 1000),
        throughput: Math.round(Math.random() * 100),
        errorRate: Math.round(Math.random() * 10),
        activeConnections: Math.round(Math.random() * 50),
      };
      return {
        success: true,
        data: performanceMetrics,
      };
    } catch (error) {
      this.logger.error('获取性能指标失败:', error);
      throw new HttpException(
        '获取性能指标失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取系统健康状态
   */
  @Get('health')
  async getHealth() {
    try {
      const healthStatus = await this.healthService.getHealthStatus();
      return {
        success: true,
        data: healthStatus,
      };
    } catch (error) {
      this.logger.error('获取健康状态失败:', error);
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取详细健康检查结果
   */
  @Get('health/detailed')
  async getDetailedHealth() {
    try {
      const healthChecks = this.healthService.getDetailedHealthChecks();
      return {
        success: true,
        data: healthChecks,
      };
    } catch (error) {
      this.logger.error('获取详细健康检查结果失败:', error);
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取系统指标
   */
  @Get('metrics/system')
  async getSystemMetrics() {
    try {
      const systemMetrics = await this.monitoringService.getSystemMetrics();
      return {
        success: true,
        data: systemMetrics,
      };
    } catch (error) {
      this.logger.error('获取系统指标失败:', error);
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取应用指标
   */
  @Get('metrics/application')
  async getApplicationMetrics() {
    try {
      const applicationMetrics = await this.monitoringService.getApplicationMetrics();
      return {
        success: true,
        data: applicationMetrics,
      };
    } catch (error) {
      this.logger.error('获取应用指标失败:', error);
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 查询指标数据
   */
  @Get('metrics/query')
  async queryMetrics(
    @Query('name') name?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('aggregation') aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count',
    @Query('interval') interval?: string,
  ) {
    try {
      const query: MetricQuery = {
        name,
        startTime,
        endTime,
        aggregation,
        interval,
      };

      const metrics = this.metricsService.queryMetrics(query);
      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      this.logger.error('查询指标数据失败:', error);
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取指标统计信息
   */
  @Get('metrics/stats')
  async getMetricsStats() {
    try {
      const stats = this.metricsService.getMetricsStats();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error('获取指标统计信息失败:', error);
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 查询日志
   */
  @Get('logs')
  async queryLogs(
    @Query('level') level?: 'debug' | 'info' | 'warn' | 'error',
    @Query('category') category?: string,
    @Query('action') action?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const query: LogQuery = {
        level,
        category,
        action,
        startTime,
        endTime,
        userId,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      };

      const logs = this.loggingService.queryLogs(query);
      return {
        success: true,
        data: logs,
      };
    } catch (error) {
      this.logger.error('查询日志失败:', error);
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取日志统计信息
   */
  @Get('logs/stats')
  async getLogStats() {
    try {
      const stats = this.loggingService.getLogStats();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error('获取日志统计信息失败:', error);
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 导出日志
   */
  @Get('logs/export')
  async exportLogs(
    @Query('level') level?: 'debug' | 'info' | 'warn' | 'error',
    @Query('category') category?: string,
    @Query('action') action?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('userId') userId?: string,
  ) {
    try {
      const query: LogQuery = {
        level,
        category,
        action,
        startTime,
        endTime,
        userId,
      };

      const csvData = this.loggingService.exportLogs(query);
      return {
        success: true,
        data: {
          content: csvData,
          filename: `logs_${new Date().toISOString().split('T')[0]}.csv`,
          mimeType: 'text/csv',
        },
      };
    } catch (error) {
      this.logger.error('导出日志失败:', error);
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取告警规则
   */
  @Get('alerts/rules')
  async getAlertRules() {
    try {
      const rules = this.monitoringService.getAlertRules();
      return {
        success: true,
        data: rules,
      };
    } catch (error) {
      this.logger.error('获取告警规则失败:', error);
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 添加告警规则
   */
  @Post('alerts/rules')
  async addAlertRule(@Body() addAlertRuleDto: AddAlertRuleDto) {
    try {
      const rule = this.monitoringService.addAlertRule(addAlertRuleDto);
      return {
        success: true,
        data: rule,
      };
    } catch (error) {
      this.logger.error('添加告警规则失败:', error);
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 删除告警规则
   */
  @Delete('alerts/rules/:ruleId')
  async removeAlertRule(@Param('ruleId') ruleId: string) {
    try {
      const success = this.monitoringService.removeAlertRule(ruleId);
      if (!success) {
        throw new HttpException(
          {
            success: false,
            error: '告警规则不存在',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        message: '告警规则删除成功',
      };
    } catch (error) {
      this.logger.error('删除告警规则失败:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取活跃告警
   */
  @Get('alerts/active')
  async getActiveAlerts() {
    try {
      const alerts = this.monitoringService.getActiveAlerts();
      return {
        success: true,
        data: alerts,
      };
    } catch (error) {
      this.logger.error('获取活跃告警失败:', error);
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取所有告警
   */
  @Get('alerts')
  async getAllAlerts() {
    try {
      const alerts = this.monitoringService.getAllAlerts();
      return {
        success: true,
        data: alerts,
      };
    } catch (error) {
      this.logger.error('获取所有告警失败:', error);
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 解决告警
   */
  @Post('alerts/:alertId/resolve')
  async resolveAlert(@Param('alertId') alertId: string) {
    try {
      const success = this.monitoringService.resolveAlert(alertId);
      if (!success) {
        throw new HttpException(
          {
            success: false,
            error: '告警不存在或已解决',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        message: '告警解决成功',
      };
    } catch (error) {
      this.logger.error('解决告警失败:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 启动监控
   */
  @Post('start')
  async startMonitoring() {
    try {
      this.monitoringService.startMonitoring();
      this.healthService.startHealthChecks();
      
      return {
        success: true,
        message: '监控已启动',
      };
    } catch (error) {
      this.logger.error('启动监控失败:', error);
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 停止监控
   */
  @Post('stop')
  async stopMonitoring() {
    try {
      this.monitoringService.stopMonitoring();
      this.healthService.stopHealthChecks();
      
      return {
        success: true,
        message: '监控已停止',
      };
    } catch (error) {
      this.logger.error('停止监控失败:', error);
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取监控状态
   */
  @Get('status')
  async getMonitoringStatus() {
    try {
      const monitoringStatus = this.monitoringService.getMonitoringStatus();
      const healthServiceStatus = this.healthService.getServiceStatus();
      const loggingServiceStatus = this.loggingService.getServiceStatus();
      
      return {
        success: true,
        data: {
          monitoring: monitoringStatus,
          health: healthServiceStatus,
          logging: loggingServiceStatus,
        },
      };
    } catch (error) {
      this.logger.error('获取监控状态失败:', error);
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 清理数据
   */
  @Post('cleanup')
  async cleanupData(
    @Body() cleanupOptions: {
      logs?: { olderThan?: string };
      metrics?: { olderThan?: string };
    },
  ) {
    try {
      const results: Record<string, number> = {};
      
      if (cleanupOptions.logs) {
        results.clearedLogs = this.loggingService.clearLogs(cleanupOptions.logs.olderThan);
      }
      
      if (cleanupOptions.metrics) {
        results.clearedMetrics = this.metricsService.clearMetrics(cleanupOptions.metrics.olderThan);
      }
      
      return {
        success: true,
        data: results,
        message: '数据清理完成',
      };
    } catch (error) {
      this.logger.error('清理数据失败:', error);
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}