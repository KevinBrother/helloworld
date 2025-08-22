import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto, UpdateTaskStatusDto, TaskOperationDto, ApiResponseDto, PaginationResponseDto } from '../../common/dto/task.dto';
import { Task } from './entities/task.entity';
import { TaskOperation } from '../../common/enums/task-status.enum';
import { ITaskPaginationResult, ITaskStatistics } from '../../common/interfaces/task.interface';

@ApiTags('任务管理')
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @ApiOperation({ summary: '创建任务' })
  @ApiResponse({ status: 201, description: '任务创建成功', type: Task })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async createTask(@Body() createTaskDto: CreateTaskDto): Promise<ApiResponseDto<Task>> {
    const task = await this.taskService.createTask(createTaskDto);
    return {
      success: true,
      message: '任务创建成功',
      data: task,
      timestamp: new Date(),
    };
  }

  @Get()
  @ApiOperation({ summary: '获取任务列表' })
  @ApiResponse({ status: 200, description: '获取成功', type: PaginationResponseDto })
  async getTasks(@Query() queryDto: TaskQueryDto): Promise<ApiResponseDto<ITaskPaginationResult>> {
    const result = await this.taskService.getTasks(queryDto);
    return {
      success: true,
      message: '获取任务列表成功',
      data: result,
      timestamp: new Date(),
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取任务统计信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getTaskStatistics(): Promise<ApiResponseDto<ITaskStatistics>> {
    const statistics = await this.taskService.getTaskStatistics();
    return {
      success: true,
      message: '获取统计信息成功',
      data: statistics,
      timestamp: new Date(),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '根据ID获取任务详情' })
  @ApiParam({ name: 'id', description: '任务ID', type: 'number' })
  @ApiResponse({ status: 200, description: '获取成功', type: Task })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async getTaskById(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<Task>> {
    const task = await this.taskService.getTaskById(id);
    return {
      success: true,
      message: '获取任务详情成功',
      data: task,
      timestamp: new Date(),
    };
  }

  @Put(':id')
  @ApiOperation({ summary: '更新任务信息' })
  @ApiParam({ name: 'id', description: '任务ID', type: 'number' })
  @ApiResponse({ status: 200, description: '更新成功', type: Task })
  @ApiResponse({ status: 404, description: '任务不存在' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async updateTask(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<ApiResponseDto<Task>> {
    const task = await this.taskService.updateTask(id, updateTaskDto);
    return {
      success: true,
      message: '任务更新成功',
      data: task,
      timestamp: new Date(),
    };
  }

  @Put(':id/status')
  @ApiOperation({ summary: '更新任务状态' })
  @ApiParam({ name: 'id', description: '任务ID', type: 'number' })
  @ApiResponse({ status: 200, description: '状态更新成功', type: Task })
  @ApiResponse({ status: 404, description: '任务不存在' })
  @ApiResponse({ status: 400, description: '状态转换无效' })
  async updateTaskStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateTaskStatusDto,
  ): Promise<ApiResponseDto<Task>> {
    const task = await this.taskService.updateTaskStatus(id, updateStatusDto);
    return {
      success: true,
      message: '任务状态更新成功',
      data: task,
      timestamp: new Date(),
    };
  }

  @Post(':id/operations')
  @ApiOperation({ summary: '执行任务操作' })
  @ApiParam({ name: 'id', description: '任务ID', type: 'number' })
  @ApiResponse({ status: 200, description: '操作执行成功', type: Task })
  @ApiResponse({ status: 404, description: '任务不存在' })
  @ApiResponse({ status: 400, description: '操作不允许' })
  async performTaskOperation(
    @Param('id', ParseIntPipe) id: number,
    @Body() operationDto: TaskOperationDto,
  ): Promise<ApiResponseDto<Task>> {
    const task = await this.taskService.performTaskOperation(
      id,
      operationDto.operation,
      operationDto.operatedBy,
    );
    return {
      success: true,
      message: `任务操作 ${operationDto.operation} 执行成功`,
      data: task,
      timestamp: new Date(),
    };
  }

  @Post(':id/start')
  @ApiOperation({ summary: '启动任务' })
  @ApiParam({ name: 'id', description: '任务ID', type: 'number' })
  @ApiResponse({ status: 200, description: '任务启动成功', type: Task })
  async startTask(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<Task>> {
    const task = await this.taskService.performTaskOperation(id, TaskOperation.START);
    return {
      success: true,
      message: '任务启动成功',
      data: task,
      timestamp: new Date(),
    };
  }

  @Post(':id/pause')
  @ApiOperation({ summary: '暂停任务' })
  @ApiParam({ name: 'id', description: '任务ID', type: 'number' })
  @ApiResponse({ status: 200, description: '任务暂停成功', type: Task })
  async pauseTask(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<Task>> {
    const task = await this.taskService.performTaskOperation(id, TaskOperation.PAUSE);
    return {
      success: true,
      message: '任务暂停成功',
      data: task,
      timestamp: new Date(),
    };
  }

  @Post(':id/resume')
  @ApiOperation({ summary: '恢复任务' })
  @ApiParam({ name: 'id', description: '任务ID', type: 'number' })
  @ApiResponse({ status: 200, description: '任务恢复成功', type: Task })
  async resumeTask(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<Task>> {
    const task = await this.taskService.performTaskOperation(id, TaskOperation.RESUME);
    return {
      success: true,
      message: '任务恢复成功',
      data: task,
      timestamp: new Date(),
    };
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消任务' })
  @ApiParam({ name: 'id', description: '任务ID', type: 'number' })
  @ApiResponse({ status: 200, description: '任务取消成功', type: Task })
  async cancelTask(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<Task>> {
    const task = await this.taskService.performTaskOperation(id, TaskOperation.CANCEL);
    return {
      success: true,
      message: '任务取消成功',
      data: task,
      timestamp: new Date(),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除任务' })
  @ApiParam({ name: 'id', description: '任务ID', type: 'number' })
  @ApiResponse({ status: 204, description: '任务删除成功' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  @ApiResponse({ status: 400, description: '任务无法删除' })
  async deleteTask(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.taskService.deleteTask(id);
  }
}