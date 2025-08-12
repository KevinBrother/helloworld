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
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { UsersService, PaginatedUsers } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { User, UserStatus } from '../../entities/mysql/user.entity';

@ApiTags('用户管理')
@Controller('users')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: '创建用户' })
  @ApiResponse({
    status: 201,
    description: '用户创建成功',
    schema: {
      type: 'object',
      description: '用户信息（不包含密码）',
    },
  })
  @ApiResponse({ status: 400, description: '用户名或邮箱已存在' })
  @ApiResponse({ status: 401, description: '未授权' })
  async create(@Body() createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: '获取用户列表' })
  @ApiQuery({ type: QueryUserDto })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: { type: 'object' },
          description: '用户列表',
        },
        total: { type: 'number', description: '总数' },
        page: { type: 'number', description: '当前页' },
        limit: { type: 'number', description: '每页数量' },
        totalPages: { type: 'number', description: '总页数' },
      },
    },
  })
  @ApiResponse({ status: 401, description: '未授权' })
  async findAll(@Query() queryDto: QueryUserDto): Promise<PaginatedUsers> {
    return this.usersService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取用户详情' })
  @ApiParam({ name: 'id', description: '用户ID', type: 'number' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'object',
      description: '用户信息（不包含密码）',
    },
  })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 401, description: '未授权' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Omit<User, 'password'>> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新用户信息' })
  @ApiParam({ name: 'id', description: '用户ID', type: 'number' })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    schema: {
      type: 'object',
      description: '用户信息（不包含密码）',
    },
  })
  @ApiResponse({ status: 400, description: '用户名或邮箱已存在' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 401, description: '未授权' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'password'>> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除用户' })
  @ApiParam({ name: 'id', description: '用户ID', type: 'number' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 401, description: '未授权' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.usersService.remove(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '修改用户状态' })
  @ApiParam({ name: 'id', description: '用户ID', type: 'number' })
  @ApiResponse({
    status: 200,
    description: '状态修改成功',
    schema: {
      type: 'object',
      description: '用户信息（不包含密码）',
    },
  })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 401, description: '未授权' })
  async changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: UserStatus,
  ): Promise<Omit<User, 'password'>> {
    return this.usersService.changeStatus(id, status);
  }

  @Post(':id/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '修改用户密码' })
  @ApiParam({ name: 'id', description: '用户ID', type: 'number' })
  @ApiResponse({ status: 200, description: '密码修改成功' })
  @ApiResponse({ status: 400, description: '旧密码错误' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 401, description: '未授权' })
  async changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
  ): Promise<{ message: string }> {
    await this.usersService.changePassword(id, oldPassword, newPassword);
    return { message: '密码修改成功' };
  }
}