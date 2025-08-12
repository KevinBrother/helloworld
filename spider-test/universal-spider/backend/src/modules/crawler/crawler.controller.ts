import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { CrawlerService } from './crawler.service';
import { CrawlRequestDto } from './dto/crawl-request.dto';
import { CrawlResultDto } from './dto/crawl-result.dto';
import { PageAnalysisDto } from './dto/page-analysis.dto';

@ApiTags('爬虫引擎')
@Controller('crawler')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

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
    return this.crawlerService.crawl(crawlRequest);
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
    return this.crawlerService.analyzePage(url);
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
    return this.crawlerService.discoverApis(taskId);
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
    return this.crawlerService.getStatus();
  }
}
