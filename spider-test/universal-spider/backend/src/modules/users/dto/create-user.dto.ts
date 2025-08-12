import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../entities/mysql/user.entity';

export class CreateUserDto {
  @ApiProperty({
    description: '用户名',
    example: 'admin',
    minLength: 3,
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(3, { message: '用户名长度不能少于3位' })
  @MaxLength(20, { message: '用户名长度不能超过20位' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: '用户名只能包含字母、数字和下划线',
  })
  username: string;

  @ApiProperty({
    description: '邮箱',
    example: 'admin@example.com',
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @ApiProperty({
    description: '密码',
    example: 'Password123',
    minLength: 6,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度不能少于6位' })
  @MaxLength(50, { message: '密码长度不能超过50位' })
  password: string;

  @ApiProperty({
    description: '昵称',
    example: '管理员',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '昵称长度不能超过50位' })
  nickname?: string;

  @ApiProperty({
    description: '用户角色',
    enum: UserRole,
    example: UserRole.USER,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: '用户角色不正确' })
  role?: UserRole;
}