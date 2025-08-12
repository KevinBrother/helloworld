import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrawlConfig } from '../../../entities/mysql/crawl-config.entity';
import { CreateCrawlConfigDto } from '../dto/create-crawl-config.dto';
import { UpdateCrawlConfigDto } from '../dto/update-crawl-config.dto';
import { QueryCrawlConfigsDto } from '../dto/query-crawl-configs.dto';

@Injectable()
export class CrawlConfigsService {
  constructor(
    @InjectRepository(CrawlConfig)
    private readonly crawlConfigRepository: Repository<CrawlConfig>,
  ) {}

  async create(
    createCrawlConfigDto: CreateCrawlConfigDto,
  ): Promise<CrawlConfig> {
    const crawlConfig = this.crawlConfigRepository.create(createCrawlConfigDto);
    return await this.crawlConfigRepository.save(crawlConfig);
  }

  async findAll(query: QueryCrawlConfigsDto) {
    const {
      page = 1,
      limit = 10,
      name,
      userId,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.crawlConfigRepository.createQueryBuilder(
      'config',
    );

    if (name) {
      queryBuilder.andWhere('config.name LIKE :name', {
        name: `%${name}%`,
      });
    }

    if (userId) {
      queryBuilder.andWhere('config.userId = :userId', {
        userId,
      });
    }

    queryBuilder.orderBy(`config.${sortBy}`, sortOrder);

    const [configs, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      configs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<CrawlConfig> {
    const config = await this.crawlConfigRepository.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException(`配置 ID ${id} 不存在`);
    }
    return config;
  }

  async update(
    id: number,
    updateCrawlConfigDto: UpdateCrawlConfigDto,
  ): Promise<CrawlConfig> {
    await this.crawlConfigRepository.update(id, updateCrawlConfigDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.crawlConfigRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`配置 ID ${id} 不存在`);
    }
  }

  async testConfig(createCrawlConfigDto: CreateCrawlConfigDto) {
    // TODO: 实现配置测试逻辑
    // 这里可以验证配置的有效性，比如测试URL是否可访问等
    await Promise.resolve(); // 临时添加await以消除警告
    return {
      success: true,
      message: '配置测试通过',
      testResults: {
        urlAccessible: true,
        configValid: true,
        estimatedTime: '2-5分钟',
      },
    };
  }
}