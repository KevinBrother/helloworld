import { Controller, Get, Post, Put, Delete, Body, Param, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ExecutionUnitService } from './execution-unit.service';
import { RegisterExecutionUnitDto, ExecutionUnitHeartbeatDto, ApiResponseDto } from '../../common/dto/task.dto';
import { ExecutionUnit } from './entities/execution-unit.entity';
import { IExecutionUnitStatistics } from '../../common/interfaces/task.interface';

@ApiTags('执行单元管理')
@Controller('execution-units')
export class ExecutionUnitController {
  constructor(private readonly executionUnitService: ExecutionUnitService) {}

  @Post('register')
  @ApiOperation({ summary: '注册执行单元' })
  @ApiResponse({ status: 201, description: '注册成功', type: ExecutionUnit })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async registerExecutionUnit(
    @Body() registerDto: RegisterExecutionUnitDto,
  ): Promise<ApiResponseDto<ExecutionUnit>> {
    const executionUnit = await this.executionUnitService.registerExecutionUnit(registerDto);
    return {
      success: true,
      message: '执行单元注册成功',
      data: executionUnit,
      timestamp: new Date(),
    };
  }

  @Get()
  @ApiOperation({ summary: '获取所有执行单元' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getAllExecutionUnits(): Promise<ApiResponseDto<ExecutionUnit[]>> {
    const executionUnits = await this.executionUnitService.getAllExecutionUnits();
    return {
      success: true,
      message: '获取执行单元列表成功',
      data: executionUnits,
      timestamp: new Date(),
    };
  }

  @Get('available')
  @ApiOperation({ summary: '获取可用的执行单元' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getAvailableExecutionUnits(): Promise<ApiResponseDto<ExecutionUnit[]>> {
    const executionUnits = await this.executionUnitService.getAvailableExecutionUnits();
    return {
      success: true,
      message: '获取可用执行单元成功',
      data: executionUnits,
      timestamp: new Date(),
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取执行单元统计信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getExecutionUnitStatistics(): Promise<ApiResponseDto<IExecutionUnitStatistics>> {
    const statistics = await this.executionUnitService.getExecutionUnitStatistics();
    return {
      success: true,
      message: '获取统计信息成功',
      data: statistics,
      timestamp: new Date(),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '根据ID获取执行单元详情' })
  @ApiParam({ name: 'id', description: '执行单元ID', type: 'string' })
  @ApiResponse({ status: 200, description: '获取成功', type: ExecutionUnit })
  @ApiResponse({ status: 404, description: '执行单元不存在' })
  async getExecutionUnitById(@Param('id') id: string): Promise<ApiResponseDto<ExecutionUnit>> {
    const executionUnit = await this.executionUnitService.getExecutionUnitById(id);
    return {
      success: true,
      message: '获取执行单元详情成功',
      data: executionUnit,
      timestamp: new Date(),
    };
  }

  @Post(':id/heartbeat')
  @ApiOperation({ summary: '发送心跳' })
  @ApiParam({ name: 'id', description: '执行单元ID', type: 'string' })
  @ApiResponse({ status: 200, description: '心跳处理成功', type: ExecutionUnit })
  @ApiResponse({ status: 404, description: '执行单元不存在' })
  async handleHeartbeat(
    @Param('id') id: string,
    @Body() heartbeatDto: ExecutionUnitHeartbeatDto,
  ): Promise<ApiResponseDto<ExecutionUnit>> {
    const executionUnit = await this.executionUnitService.handleHeartbeat(id, heartbeatDto);
    return {
      success: true,
      message: '心跳处理成功',
      data: executionUnit,
      timestamp: new Date(),
    };
  }

  @Post(':id/allocate')
  @ApiOperation({ summary: '分配任务给执行单元' })
  @ApiParam({ name: 'id', description: '执行单元ID', type: 'string' })
  @ApiResponse({ status: 200, description: '任务分配成功' })
  @ApiResponse({ status: 400, description: '分配失败' })
  async allocateTask(@Param('id') id: string): Promise<ApiResponseDto<boolean>> {
    const success = await this.executionUnitService.allocateTask(id);
    return {
      success,
      message: success ? '任务分配成功' : '任务分配失败',
      data: success,
      timestamp: new Date(),
    };
  }

  @Post(':id/release')
  @ApiOperation({ summary: '释放执行单元的任务' })
  @ApiParam({ name: 'id', description: '执行单元ID', type: 'string' })
  @ApiResponse({ status: 200, description: '任务释放成功' })
  async releaseTask(@Param('id') id: string): Promise<ApiResponseDto<void>> {
    await this.executionUnitService.releaseTask(id);
    return {
      success: true,
      message: '任务释放成功',
      data: undefined,
      timestamp: new Date(),
    };
  }

  @Put(':id/reset-load')
  @ApiOperation({ summary: '重置执行单元负载' })
  @ApiParam({ name: 'id', description: '执行单元ID', type: 'string' })
  @ApiResponse({ status: 200, description: '负载重置成功', type: ExecutionUnit })
  async resetExecutionUnitLoad(@Param('id') id: string): Promise<ApiResponseDto<ExecutionUnit>> {
    const executionUnit = await this.executionUnitService.resetExecutionUnitLoad(id);
    return {
      success: true,
      message: '执行单元负载重置成功',
      data: executionUnit,
      timestamp: new Date(),
    };
  }

  @Put(':id/offline')
  @ApiOperation({ summary: '标记执行单元为离线' })
  @ApiParam({ name: 'id', description: '执行单元ID', type: 'string' })
  @ApiResponse({ status: 200, description: '标记成功', type: ExecutionUnit })
  async markAsOffline(@Param('id') id: string): Promise<ApiResponseDto<ExecutionUnit>> {
    const executionUnit = await this.executionUnitService.markAsOffline(id);
    return {
      success: true,
      message: '执行单元已标记为离线',
      data: executionUnit,
      timestamp: new Date(),
    };
  }

  @Put(':id/online')
  @ApiOperation({ summary: '标记执行单元为在线' })
  @ApiParam({ name: 'id', description: '执行单元ID', type: 'string' })
  @ApiResponse({ status: 200, description: '标记成功', type: ExecutionUnit })
  async markAsOnline(@Param('id') id: string): Promise<ApiResponseDto<ExecutionUnit>> {
    const executionUnit = await this.executionUnitService.markAsOnline(id);
    return {
      success: true,
      message: '执行单元已标记为在线',
      data: executionUnit,
      timestamp: new Date(),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '注销执行单元' })
  @ApiParam({ name: 'id', description: '执行单元ID', type: 'string' })
  @ApiResponse({ status: 204, description: '注销成功' })
  @ApiResponse({ status: 404, description: '执行单元不存在' })
  @ApiResponse({ status: 400, description: '执行单元无法注销' })
  async unregisterExecutionUnit(@Param('id') id: string): Promise<void> {
    await this.executionUnitService.unregisterExecutionUnit(id);
  }
}