import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { DataProcessingService } from './services/data-processing.service';
import { DataValidationService } from './services/data-validation.service';
import { DataExportService, ExportOptions } from './services/data-export.service';
import { DataStorageService, QueryOptions } from './services/data-storage.service';
import { ExtractedData } from '../crawler/dto/crawl-result.dto';

export interface ProcessDataDto {
  data: ExtractedData[];
  rules?: unknown[];
}

export interface ExportDataDto {
  data: ExtractedData[];
  options: ExportOptions;
}

export interface StoreDataDto {
  data: ExtractedData | ExtractedData[];
  options?: {
    database?: string;
    collection?: string;
    indexFields?: string[];
    ttl?: number;
    compression?: boolean;
  };
}

@Controller('data')
export class DataController {
  private readonly logger = new Logger(DataController.name);

  constructor(
    private readonly dataProcessingService: DataProcessingService,
    private readonly dataValidationService: DataValidationService,
    private readonly dataExportService: DataExportService,
    private readonly dataStorageService: DataStorageService,
  ) {}

  /**
   * 处理数据
   */
  @Post('process')
  async processData(@Body() processDataDto: ProcessDataDto) {
    try {
      this.logger.log('开始处理数据');

      const { data, rules } = processDataDto;

      // 数据验证
      const validationResults = await Promise.all(
        data.map((item) => this.dataValidationService.validateData(item, [])),
      );

      const validData = data.filter((_, index) => validationResults[index].isValid);
      const invalidData = data.filter((_, index) => !validationResults[index].isValid);

      // 数据处理
      const processedData = this.dataProcessingService.processExtractedData(
        validData,
        (rules as any[]) || [],
      );

      // 数据清洗
      const cleanedData = this.dataProcessingService.cleanData(
        processedData,
        [],
      );

      return {
        success: true,
        data: {
          processed: cleanedData,
          invalid: invalidData,
          stats: {
            total: data.length,
            valid: validData.length,
            invalid: invalidData.length,
            processed: cleanedData.length,
          },
        },
      };
    } catch (error) {
      this.logger.error('数据处理失败:', error);
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
   * 验证数据
   */
  @Post('validate')
  async validateData(@Body() data: ExtractedData[]) {
    try {
      this.logger.log('开始验证数据');

      const validationResults = await Promise.all(
        data.map((item) => this.dataValidationService.validateData(item, [])),
      );

      const validCount = validationResults.filter((result) => result.isValid).length;
      const invalidCount = validationResults.length - validCount;

      return {
        success: true,
        data: {
          results: validationResults,
          stats: {
            total: data.length,
            valid: validCount,
            invalid: invalidCount,
            validationRate: (validCount / data.length) * 100,
          },
        },
      };
    } catch (error) {
      this.logger.error('数据验证失败:', error);
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
   * 导出数据
   */
  @Post('export')
  async exportData(@Body() exportDataDto: ExportDataDto) {
    try {
      this.logger.log('开始导出数据');

      const { data, options } = exportDataDto;

      const result = await this.dataExportService.exportData(data, options);

      if (!result.success) {
        throw new HttpException(
          {
            success: false,
            error: result.error,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('数据导出失败:', error);
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
   * 存储数据
   */
  @Post('store')
  async storeData(@Body() storeDataDto: StoreDataDto) {
    try {
      this.logger.log('开始存储数据');

      const { data, options = {} } = storeDataDto;

      let result;
      if (Array.isArray(data)) {
        result = await this.dataStorageService.storeBatchData(data, options);
      } else {
        result = await this.dataStorageService.storeData(data, options);
      }

      if (!result.success) {
        throw new HttpException(
          {
            success: false,
            error: result.error,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('数据存储失败:', error);
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
   * 查询数据
   */
  @Get('query')
  async queryData(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    try {
      this.logger.log('开始查询数据');

      const options: QueryOptions = {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
        sortBy,
        sortOrder,
      };

      const result = await this.dataStorageService.queryData(options);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('数据查询失败:', error);
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
   * 根据ID获取数据
   */
  @Get(':id')
  async getDataById(@Param('id') id: string) {
    try {
      this.logger.log(`根据ID获取数据: ${id}`);

      const data = await this.dataStorageService.getDataById(id);

      if (!data) {
        throw new HttpException(
          {
            success: false,
            error: '数据不存在',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      this.logger.error('根据ID获取数据失败:', error);
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
   * 更新数据
   */
  @Put(':id')
  async updateData(
    @Param('id') id: string,
    @Body() updateData: Partial<ExtractedData>,
  ) {
    try {
      this.logger.log(`更新数据: ${id}`);

      const success = await this.dataStorageService.updateData(id, updateData);

      if (!success) {
        throw new HttpException(
          {
            success: false,
            error: '数据更新失败',
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        success: true,
        message: '数据更新成功',
      };
    } catch (error) {
      this.logger.error('数据更新失败:', error);
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
   * 删除数据
   */
  @Delete(':id')
  async deleteData(@Param('id') id: string) {
    try {
      this.logger.log(`删除数据: ${id}`);

      const success = await this.dataStorageService.deleteData(id);

      if (!success) {
        throw new HttpException(
          {
            success: false,
            error: '数据删除失败',
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        success: true,
        message: '数据删除成功',
      };
    } catch (error) {
      this.logger.error('数据删除失败:', error);
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
   * 获取数据统计信息
   */
  @Get('stats/overview')
  async getDataStats() {
    try {
      this.logger.log('获取数据统计信息');

      const storageStats = this.dataStorageService.getStorageStats();
      const exportStats = this.dataExportService.getExportStats();

      return {
        success: true,
        data: {
          storage: storageStats,
          export: exportStats,
        },
      };
    } catch (error) {
      this.logger.error('获取数据统计信息失败:', error);
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