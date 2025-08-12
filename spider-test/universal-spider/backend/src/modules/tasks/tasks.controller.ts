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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { Task } from '../../entities/mysql/task.entity';

@ApiTags('任务管理')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: '创建爬虫任务' })
  @ApiResponse({ status: 201, description: '任务创建成功', type: Task })
  async create(@Body() createTaskDto: CreateTaskDto): Promise<Task> {
    return this.tasksService.create(createTaskDto);
  }

  @Get()
  @ApiOperation({ summary: '获取任务列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(@Query() query: TaskQueryDto) {
    return this.tasksService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取任务详情' })
  @ApiResponse({ status: 200, description: '获取成功', type: Task })
  async findOne(@Param('id') id: string): Promise<Task> {
    return this.tasksService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新任务' })
  @ApiResponse({ status: 200, description: '更新成功', type: Task })
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    return this.tasksService.update(+id, updateTaskDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除任务' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.tasksService.remove(+id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: '启动任务' })
  @ApiResponse({ status: 200, description: '任务启动成功' })
  async startTask(@Param('id') id: string): Promise<{ message: string }> {
    await this.tasksService.startTask(+id);
    return { message: '任务启动成功' };
  }

  @Post(':id/stop')
  @ApiOperation({ summary: '停止任务' })
  @ApiResponse({ status: 200, description: '任务停止成功' })
  async stopTask(@Param('id') id: string): Promise<{ message: string }> {
    await this.tasksService.stopTask(+id);
    return { message: '任务停止成功' };
  }

  @Post(':id/pause')
  @ApiOperation({ summary: '暂停任务' })
  @ApiResponse({ status: 200, description: '任务暂停成功' })
  async pauseTask(@Param('id') id: string): Promise<{ message: string }> {
    await this.tasksService.pauseTask(+id);
    return { message: '任务暂停成功' };
  }

  @Post(':id/resume')
  @ApiOperation({ summary: '恢复任务' })
  @ApiResponse({ status: 200, description: '任务恢复成功' })
  async resumeTask(@Param('id') id: string): Promise<{ message: string }> {
    await this.tasksService.resumeTask(+id);
    return { message: '任务恢复成功' };
  }

  @Get(':id/logs')
  @ApiOperation({ summary: '获取任务日志' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getTaskLogs(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.tasksService.getTaskLogs(+id, page, limit);
  }

  @Get(':id/results')
  @ApiOperation({ summary: '获取任务结果' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getTaskResults(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.tasksService.getTaskResults(+id, page, limit);
  }

  @Get('stats/overview')
  @ApiOperation({ summary: '获取任务统计概览' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getTaskStats() {
    return this.tasksService.getTaskStats();
  }
}
