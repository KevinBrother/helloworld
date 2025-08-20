import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  // ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { CrawlerService } from './crawler.service';
import { BatchCrawlerService } from './services/batch-crawler.service';
import type { BatchCrawlRequest } from './services/batch-crawler.service';
import {
  TaskSchedulerService,
  CrawlTask,
  TaskStatus,
} from './services/task-scheduler.service';
import {
  CrawlConfigManagerService,
  CrawlConfig,
} from './services/crawl-config-manager.service';
import { CrawlerMonitorService } from './services/crawler-monitor.service';
import { CrawlRequestDto } from './dto/crawl-request.dto';
import { CrawlResultDto } from './dto/crawl-result.dto';
import { PageAnalysisDto } from './dto/page-analysis.dto';

@ApiTags('爬虫引擎')
@Controller('crawler')
// @UseGuards(AuthGuard('jwt'))
// @ApiBearerAuth()
export class CrawlerController {
  constructor(
    private readonly crawlerService: CrawlerService,
    private readonly batchCrawlerService: BatchCrawlerService,
    private readonly taskSchedulerService: TaskSchedulerService,
    private readonly configManagerService: CrawlConfigManagerService,
    private readonly monitorService: CrawlerMonitorService,
  ) {}

  @Post('crawl')
  @ApiOperation({ summary: '执行爬虫任务' })
  @ApiBody({ type: CrawlRequestDto })
  @ApiResponse({
    status: 200,
    description: '爬取成功',
    type: CrawlResultDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  async crawl(@Body() crawlRequest: CrawlRequestDto): Promise<CrawlResultDto> {
    return await this.crawlerService.crawl(crawlRequest);
  }

  @Post('analyze')
  @ApiOperation({ summary: '分析页面结构' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '目标URL' },
      },
      required: ['url'],
    },
  })
  @ApiResponse({
    status: 200,
    description: '分析成功',
    type: PageAnalysisDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  async analyzePage(@Body('url') url: string): Promise<PageAnalysisDto> {
    return await this.crawlerService.analyzePage(url);
  }

  @Get('discover-apis/:taskId')
  @ApiOperation({ summary: '发现页面API接口' })
  @ApiParam({ name: 'taskId', description: '任务ID', type: 'number' })
  @ApiResponse({
    status: 200,
    description: '发现成功',
    schema: {
      type: 'object',
      properties: {
        apis: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              method: { type: 'string' },
              headers: { type: 'object' },
              params: { type: 'object' },
              response: { type: 'object' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: '任务不存在' })
  @ApiResponse({ status: 401, description: '未授权' })
  async discoverApis(@Param('taskId', ParseIntPipe) taskId: number) {
    return await this.crawlerService.discoverApis(taskId);
  }

  @Get('status')
  @ApiOperation({ summary: '获取爬虫引擎状态' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        activeBrowsers: { type: 'number' },
        queueSize: { type: 'number' },
        memoryUsage: { type: 'object' },
        uptime: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: '未授权' })
  async getStatus() {
    return await this.crawlerService.getStatus();
  }

  // 批量爬取相关API
  @Post('batch')
  @ApiOperation({ summary: '批量爬取URL' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'URL列表',
        },
        config: {
          type: 'object',
          description: '爬取配置',
        },
        options: {
          type: 'object',
          description: '批量爬取选项',
        },
      },
      required: ['urls', 'config'],
    },
  })
  @ApiResponse({ status: 200, description: '批量爬取成功' })
  async batchCrawl(@Body() request: BatchCrawlRequest) {
    return await this.batchCrawlerService.batchCrawl(request);
  }

  // 任务调度相关API
  @Post('tasks')
  @ApiOperation({ summary: '创建爬虫任务' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '任务名称' },
        description: { type: 'string', description: '任务描述' },
        request: { type: 'object', description: '批量爬取请求' },
        schedule: { type: 'string', description: 'Cron表达式' },
        enabled: { type: 'boolean', description: '是否启用' },
        priority: { type: 'number', description: '优先级' },
        maxRetries: { type: 'number', description: '最大重试次数' },
      },
      required: ['name', 'request'],
    },
  })
  @ApiResponse({ status: 201, description: '任务创建成功' })
  async createTask(
    @Body()
    taskData: Omit<
      CrawlTask,
      'id' | 'createdAt' | 'updatedAt' | 'status' | 'retryCount'
    >,
  ) {
    return await this.taskSchedulerService.createTask(taskData);
  }

  @Get('tasks')
  @ApiOperation({ summary: '获取所有任务' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getAllTasks() {
    return this.taskSchedulerService.getAllTasks();
  }

  @Get('tasks/:taskId')
  @ApiOperation({ summary: '获取任务详情' })
  @ApiParam({ name: 'taskId', description: '任务ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  getTask(@Param('taskId') taskId: string) {
    const task = this.taskSchedulerService.getTask(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }
    return task;
  }

  @Put('tasks/:taskId')
  @ApiOperation({ summary: '更新任务' })
  @ApiParam({ name: 'taskId', description: '任务ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateTask(
    @Param('taskId') taskId: string,
    @Body() updates: Partial<CrawlTask>,
  ) {
    return this.taskSchedulerService.updateTask(taskId, updates);
  }

  @Delete('tasks/:taskId')
  @ApiOperation({ summary: '删除任务' })
  @ApiParam({ name: 'taskId', description: '任务ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteTask(@Param('taskId') taskId: string) {
    return this.taskSchedulerService.deleteTask(taskId);
  }

  @Post('tasks/:taskId/execute')
  @ApiOperation({ summary: '手动执行任务' })
  @ApiParam({ name: 'taskId', description: '任务ID' })
  @ApiResponse({ status: 200, description: '执行成功' })
  async executeTask(@Param('taskId') taskId: string) {
    return this.taskSchedulerService.executeTask(taskId);
  }

  @Post('tasks/:taskId/pause')
  @ApiOperation({ summary: '暂停任务' })
  @ApiParam({ name: 'taskId', description: '任务ID' })
  @ApiResponse({ status: 200, description: '暂停成功' })
  async pauseTask(@Param('taskId') taskId: string) {
    return this.taskSchedulerService.pauseTask(taskId);
  }

  @Post('tasks/:taskId/resume')
  @ApiOperation({ summary: '恢复任务' })
  @ApiParam({ name: 'taskId', description: '任务ID' })
  @ApiResponse({ status: 200, description: '恢复成功' })
  async resumeTask(@Param('taskId') taskId: string) {
    return this.taskSchedulerService.resumeTask(taskId);
  }

  @Get('tasks/status/:status')
  @ApiOperation({ summary: '根据状态获取任务' })
  @ApiParam({ name: 'status', description: '任务状态' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getTasksByStatus(@Param('status') status: TaskStatus) {
    return this.taskSchedulerService.getTasksByStatus(status);
  }

  @Get('scheduler/stats')
  @ApiOperation({ summary: '获取调度器统计信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getSchedulerStats() {
    return this.taskSchedulerService.getStats();
  }

  // 配置管理相关API
  @Post('configs')
  @ApiOperation({ summary: '创建爬虫配置' })
  @ApiResponse({ status: 201, description: '配置创建成功' })
  async createConfig(
    @Body()
    config: Omit<CrawlConfig, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>,
  ) {
    return this.configManagerService.createConfig(config);
  }

  @Get('configs')
  @ApiOperation({ summary: '获取所有配置' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getAllConfigs() {
    return this.configManagerService.getAllConfigs();
  }

  @Get('configs/:configId')
  @ApiOperation({ summary: '获取配置详情' })
  @ApiParam({ name: 'configId', description: '配置ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getConfig(@Param('configId') configId: string) {
    return this.configManagerService.getConfig(configId);
  }

  @Put('configs/:configId')
  @ApiOperation({ summary: '更新配置' })
  @ApiParam({ name: 'configId', description: '配置ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateConfig(
    @Param('configId') configId: string,
    @Body() updates: Partial<CrawlConfig>,
  ) {
    return this.configManagerService.updateConfig(configId, updates);
  }

  @Delete('configs/:configId')
  @ApiOperation({ summary: '删除配置' })
  @ApiParam({ name: 'configId', description: '配置ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteConfig(@Param('configId') configId: string) {
    return this.configManagerService.deleteConfig(configId);
  }

  @Get('configs/domain/:domain')
  @ApiOperation({ summary: '根据域名获取配置' })
  @ApiParam({ name: 'domain', description: '域名' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getConfigByDomain(@Param('domain') domain: string) {
    return this.configManagerService.getConfigByDomain(domain);
  }

  @Post('configs/:configId/clone')
  @ApiOperation({ summary: '克隆配置' })
  @ApiParam({ name: 'configId', description: '配置ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newName: { type: 'string', description: '新配置名称' },
      },
      required: ['newName'],
    },
  })
  @ApiResponse({ status: 201, description: '克隆成功' })
  async cloneConfig(
    @Param('configId') configId: string,
    @Body('newName') newName: string,
  ) {
    return this.configManagerService.cloneConfig(configId, newName);
  }

  @Post('configs/:configId/test')
  @ApiOperation({ summary: '测试配置' })
  @ApiParam({ name: 'configId', description: '配置ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        testUrl: { type: 'string', description: '测试URL' },
      },
      required: ['testUrl'],
    },
  })
  @ApiResponse({ status: 200, description: '测试完成' })
  async testConfig(
    @Param('configId') configId: string,
    @Body('testUrl') testUrl: string,
  ) {
    const config = this.configManagerService.getConfig(configId);
    if (!config) {
      throw new Error('配置不存在');
    }
    return this.configManagerService.testConfig(config, testUrl);
  }

  @Get('configs/templates')
  @ApiOperation({ summary: '获取配置模板' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getTemplates() {
    return this.configManagerService.getTemplates();
  }

  @Get('configs/stats')
  @ApiOperation({ summary: '获取配置统计信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getConfigStats() {
    return this.configManagerService.getConfigStats();
  }

  // 监控相关API
  @Get('monitor/metrics')
  @ApiOperation({ summary: '获取当前监控指标' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getCurrentMetrics() {
    return this.monitorService.getCurrentMetrics();
  }

  @Get('monitor/metrics/history')
  @ApiOperation({ summary: '获取历史监控指标' })
  @ApiQuery({
    name: 'hours',
    description: '小时数',
    required: false,
    type: 'number',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  getMetricsHistory(@Query('hours') hours?: number) {
    return this.monitorService.getMetricsHistory(hours);
  }

  @Get('monitor/alerts')
  @ApiOperation({ summary: '获取活跃告警' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getActiveAlerts() {
    return this.monitorService.getActiveAlerts();
  }

  @Get('monitor/alerts/all')
  @ApiOperation({ summary: '获取所有告警' })
  @ApiQuery({
    name: 'limit',
    description: '限制数量',
    required: false,
    type: 'number',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  getAllAlerts(@Query('limit') limit?: number) {
    return this.monitorService.getAllAlerts(limit);
  }

  @Post('monitor/alerts/:alertId/resolve')
  @ApiOperation({ summary: '解决告警' })
  @ApiParam({ name: 'alertId', description: '告警ID' })
  @ApiResponse({ status: 200, description: '解决成功' })
  resolveAlert(@Param('alertId') alertId: string) {
    return this.monitorService.resolveAlert(alertId);
  }

  @Post('monitor/report')
  @ApiOperation({ summary: '生成性能报告' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          format: 'date-time',
          description: '开始时间',
        },
        endDate: {
          type: 'string',
          format: 'date-time',
          description: '结束时间',
        },
      },
      required: ['startDate', 'endDate'],
    },
  })
  @ApiResponse({ status: 200, description: '报告生成成功' })
  async generatePerformanceReport(
    @Body() body: { startDate: string; endDate: string },
  ) {
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    return this.monitorService.generatePerformanceReport(startDate, endDate);
  }

  @Post('monitor/reset')
  @ApiOperation({ summary: '重置监控指标' })
  @ApiResponse({ status: 200, description: '重置成功' })
  resetMetrics() {
    this.monitorService.resetMetrics();
    return { message: '监控指标已重置' };
  }

  @Get('monitor/config')
  @ApiOperation({ summary: '获取监控配置' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getMonitorConfig() {
    return this.monitorService.getConfig();
  }

  @Put('monitor/config')
  @ApiOperation({ summary: '更新监控配置' })
  @ApiResponse({ status: 200, description: '更新成功' })
  updateMonitorConfig(@Body() config: any) {
    this.monitorService.updateConfig(config);
    return { message: '监控配置已更新' };
  }
}
