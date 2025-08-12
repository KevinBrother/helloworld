import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../../../entities/mysql/user.entity';

export class QueryUserDto {
  @ApiProperty({
    description: '页码',
    example: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码不能小于1' })
  page?: number = 1;

  @ApiProperty({
    description: '每页数量',
    example: 10,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量不能小于1' })
  @Max(100, { message: '每页数量不能大于100' })
  limit?: number = 10;

  @ApiProperty({
    description: '用户名搜索',
    example: 'admin',
    required: false,
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({
    description: '邮箱搜索',
    example: 'admin@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: '用户角色筛选',
    enum: UserRole,
    example: UserRole.USER,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: '用户角色不正确' })
  role?: UserRole;

  @ApiProperty({
    description: '用户状态筛选',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserStatus, { message: '用户状态不正确' })
  status?: UserStatus;

  @ApiProperty({
    description: '关键词搜索（用户名、邮箱、昵称）',
    example: 'admin',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: '排序字段',
    example: 'createdAt',
    required: false,
    enum: ['id', 'username', 'email', 'createdAt', 'updatedAt', 'lastLoginAt'],
  })
  @IsOptional()
  @IsString()
  @IsEnum(['id', 'username', 'email', 'createdAt', 'updatedAt', 'lastLoginAt'], {
    message: '排序字段不正确',
  })
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: '排序方向',
    example: 'DESC',
    required: false,
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toUpperCase())
  @IsEnum(['ASC', 'DESC'], { message: '排序方向只能是ASC或DESC' })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}