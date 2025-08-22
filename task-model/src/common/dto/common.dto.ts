import { ApiProperty } from '@nestjs/swagger';

/**
 * 通用API响应DTO
 */
export class ApiResponseDto<T = any> {
  @ApiProperty({ description: '状态码' })
  code: number;

  @ApiProperty({ description: '响应消息' })
  message: string;

  @ApiProperty({ description: '响应数据' })
  data?: T;

  @ApiProperty({ description: '是否成功' })
  success: boolean;

  @ApiProperty({ description: '响应时间戳' })
  timestamp: string;
}

/**
 * 分页查询DTO
 */
export class PaginationDto {
  @ApiProperty({ description: '页码', default: 1, minimum: 1 })
  page: number = 1;

  @ApiProperty({ description: '每页数量', default: 10, minimum: 1, maximum: 100 })
  limit: number = 10;

  @ApiProperty({ description: '排序字段', required: false })
  sortBy?: string;

  @ApiProperty({ description: '排序方向', enum: ['ASC', 'DESC'], default: 'DESC', required: false })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

/**
 * 分页响应DTO
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({ description: '数据列表' })
  items: T[];

  @ApiProperty({ description: '总数量' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;

  @ApiProperty({ description: '是否有下一页' })
  hasNext: boolean;

  @ApiProperty({ description: '是否有上一页' })
  hasPrev: boolean;
}