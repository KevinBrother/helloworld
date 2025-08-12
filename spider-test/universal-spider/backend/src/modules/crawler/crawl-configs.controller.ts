import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CrawlConfigsService } from './services/crawl-configs.service';
import { CreateCrawlConfigDto } from './dto/create-crawl-config.dto';
import { UpdateCrawlConfigDto } from './dto/update-crawl-config.dto';
import { QueryCrawlConfigsDto } from './dto/query-crawl-configs.dto';
import { CrawlConfig } from '../../entities/mysql/crawl-config.entity';

@ApiTags('爬虫配置管理')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('crawl-configs')
export class CrawlConfigsController {
  constructor(private readonly crawlConfigsService: CrawlConfigsService) {}

  @Post()
  @ApiOperation({ summary: '创建爬虫配置' })
  @ApiResponse({ status: 201, description: '配置创建成功', type: CrawlConfig })
  async create(
    @Body() createCrawlConfigDto: CreateCrawlConfigDto,
  ): Promise<CrawlConfig> {
    return await this.crawlConfigsService.create(createCrawlConfigDto);
  }

  @Get()
  @ApiOperation({ summary: '获取配置列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(@Query() query: QueryCrawlConfigsDto) {
    return await this.crawlConfigsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取配置详情' })
  @ApiResponse({ status: 200, description: '获取成功', type: CrawlConfig })
  async findOne(@Param('id') id: string): Promise<CrawlConfig> {
    return await this.crawlConfigsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新配置' })
  @ApiResponse({ status: 200, description: '更新成功', type: CrawlConfig })
  async update(
    @Param('id') id: string,
    @Body() updateCrawlConfigDto: UpdateCrawlConfigDto,
  ): Promise<CrawlConfig> {
    return await this.crawlConfigsService.update(+id, updateCrawlConfigDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除配置' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@Param('id') id: string): Promise<void> {
    return await this.crawlConfigsService.remove(+id);
  }

  @Post('test')
  @ApiOperation({ summary: '测试配置' })
  @ApiResponse({ status: 200, description: '测试成功' })
  async testConfig(@Body() createCrawlConfigDto: CreateCrawlConfigDto) {
    return await this.crawlConfigsService.testConfig(createCrawlConfigDto);
  }
}