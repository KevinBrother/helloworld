import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ExecutionUnit } from './entities/execution-unit.entity';
import { RegisterExecutionUnitDto, ExecutionUnitHeartbeatDto } from '../../common/dto/task.dto';
import { ExecutionUnitStatus } from '../../common/enums/task-status.enum';
import { IExecutionUnitStatistics } from '../../common/interfaces/task.interface';

@Injectable()
export class ExecutionUnitService {
  private readonly logger = new Logger(ExecutionUnitService.name);
  private readonly HEARTBEAT_TIMEOUT = 180000; // 3分钟心跳超时

  constructor(
    @InjectRepository(ExecutionUnit)
    private readonly executionUnitRepository: Repository<ExecutionUnit>,
  ) {
    // 启动定时任务检查心跳超时
    this.startHeartbeatMonitor();
  }

  /**
   * 注册执行单元
   */
  async registerExecutionUnit(registerDto: RegisterExecutionUnitDto): Promise<ExecutionUnit> {
    try {
      // 检查是否已存在
      const existingUnit = await this.executionUnitRepository.findOne({
        where: { id: registerDto.id },
      });

      if (existingUnit) {
        // 更新现有执行单元
        Object.assign(existingUnit, registerDto, {
          status: ExecutionUnitStatus.AVAILABLE,
          lastHeartbeat: new Date(),
          updatedAt: new Date(),
        });
        const updatedUnit = await this.executionUnitRepository.save(existingUnit);
        this.logger.log(`执行单元重新注册: ${registerDto.id}`);
        return updatedUnit;
      } else {
        // 创建新的执行单元
        const executionUnit = this.executionUnitRepository.create({
          ...registerDto,
          status: ExecutionUnitStatus.AVAILABLE,
          currentLoad: 0,
          lastHeartbeat: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        const savedUnit = await this.executionUnitRepository.save(executionUnit);
        this.logger.log(`新执行单元注册: ${registerDto.id}`);
        return savedUnit;
      }
    } catch (error) {
      this.logger.error(`注册执行单元失败: ${error.message}`, error.stack);
      throw new BadRequestException(`注册执行单元失败: ${error.message}`);
    }
  }

  /**
   * 处理心跳
   */
  async handleHeartbeat(id: string, heartbeatDto: ExecutionUnitHeartbeatDto): Promise<ExecutionUnit> {
    const executionUnit = await this.executionUnitRepository.findOne({ where: { id } });
    
    if (!executionUnit) {
      throw new NotFoundException(`执行单元不存在: ${id}`);
    }

    // 更新心跳信息
    executionUnit.updateHeartbeat(heartbeatDto.currentLoad, heartbeatDto.metadata);
    
    const updatedUnit = await this.executionUnitRepository.save(executionUnit);
    this.logger.debug(`收到心跳: ${id}, 负载: ${heartbeatDto.currentLoad}/${executionUnit.capacity}`);
    
    return updatedUnit;
  }

  /**
   * 获取所有执行单元
   */
  async getAllExecutionUnits(): Promise<ExecutionUnit[]> {
    return this.executionUnitRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 根据ID获取执行单元
   */
  async getExecutionUnitById(id: string): Promise<ExecutionUnit> {
    const executionUnit = await this.executionUnitRepository.findOne({ where: { id } });
    
    if (!executionUnit) {
      throw new NotFoundException(`执行单元不存在: ${id}`);
    }
    
    return executionUnit;
  }

  /**
   * 获取可用的执行单元
   */
  async getAvailableExecutionUnits(taskType?: string): Promise<ExecutionUnit[]> {
    const queryBuilder = this.executionUnitRepository.createQueryBuilder('unit')
      .where('unit.status = :status', { status: ExecutionUnitStatus.AVAILABLE })
      .andWhere('unit.currentLoad < unit.capacity')
      .orderBy('unit.loadRate', 'ASC'); // 按负载率升序排列

    const units = await queryBuilder.getMany();
    
    // 如果指定了任务类型，进一步过滤
    if (taskType) {
      return units.filter(unit => unit.supportsTaskType(taskType));
    }
    
    return units;
  }

  /**
   * 分配任务给执行单元
   */
  async allocateTask(executionUnitId: string): Promise<boolean> {
    const executionUnit = await this.getExecutionUnitById(executionUnitId);
    
    const success = executionUnit.allocateTask();
    if (success) {
      await this.executionUnitRepository.save(executionUnit);
      this.logger.log(`任务分配成功: ${executionUnitId}, 当前负载: ${executionUnit.currentLoad}/${executionUnit.capacity}`);
    } else {
      this.logger.warn(`任务分配失败: ${executionUnitId}, 执行单元不可用或已满载`);
    }
    
    return success;
  }

  /**
   * 释放执行单元的任务
   */
  async releaseTask(executionUnitId: string): Promise<void> {
    const executionUnit = await this.getExecutionUnitById(executionUnitId);
    
    executionUnit.releaseTask();
    await this.executionUnitRepository.save(executionUnit);
    
    this.logger.log(`任务释放成功: ${executionUnitId}, 当前负载: ${executionUnit.currentLoad}/${executionUnit.capacity}`);
  }

  /**
   * 注销执行单元
   */
  async unregisterExecutionUnit(id: string): Promise<void> {
    const executionUnit = await this.getExecutionUnitById(id);
    
    // 检查是否有正在执行的任务
    if (executionUnit.currentLoad > 0) {
      throw new BadRequestException(`执行单元 ${id} 仍有 ${executionUnit.currentLoad} 个任务在执行，无法注销`);
    }
    
    await this.executionUnitRepository.remove(executionUnit);
    this.logger.log(`执行单元注销成功: ${id}`);
  }

  /**
   * 获取执行单元统计信息
   */
  async getExecutionUnitStatistics(): Promise<IExecutionUnitStatistics> {
    const [total, available, busy, offline] = await Promise.all([
      this.executionUnitRepository.count(),
      this.executionUnitRepository.count({ where: { status: ExecutionUnitStatus.AVAILABLE } }),
      this.executionUnitRepository.count({ where: { status: ExecutionUnitStatus.BUSY } }),
      this.executionUnitRepository.count({ where: { status: ExecutionUnitStatus.OFFLINE } }),
    ]);

    // 计算总容量和当前负载
    const units = await this.executionUnitRepository.find();
    const totalCapacity = units.reduce((sum, unit) => sum + unit.capacity, 0);
    const totalLoad = units.reduce((sum, unit) => sum + unit.currentLoad, 0);
    const averageLoadRate = totalCapacity > 0 ? Math.round((totalLoad / totalCapacity) * 100) : 0;

    return {
      total,
      available,
      busy,
      offline,
      totalCapacity,
      totalLoad,
      currentLoad: totalLoad,
      averageLoadRate,
      utilizationRate: averageLoadRate,
    };
  }

  /**
   * 启动心跳监控
   */
  private startHeartbeatMonitor(): void {
    setInterval(async () => {
      try {
        await this.checkHeartbeatTimeouts();
      } catch (error) {
        this.logger.error('心跳检查失败', error.stack);
      }
    }, 60000); // 每分钟检查一次
  }

  /**
   * 检查心跳超时
   */
  private async checkHeartbeatTimeouts(): Promise<void> {
    const timeoutThreshold = new Date(Date.now() - this.HEARTBEAT_TIMEOUT);
    
    const timeoutUnits = await this.executionUnitRepository.find({
      where: [
        { lastHeartbeat: LessThan(timeoutThreshold), status: ExecutionUnitStatus.AVAILABLE },
        { lastHeartbeat: LessThan(timeoutThreshold), status: ExecutionUnitStatus.BUSY },
      ],
    });

    for (const unit of timeoutUnits) {
      unit.markAsOffline();
      await this.executionUnitRepository.save(unit);
      this.logger.warn(`执行单元心跳超时，标记为离线: ${unit.id}`);
    }

    if (timeoutUnits.length > 0) {
      this.logger.log(`检查到 ${timeoutUnits.length} 个执行单元心跳超时`);
    }
  }

  /**
   * 重置执行单元负载
   */
  async resetExecutionUnitLoad(id: string): Promise<ExecutionUnit> {
    const executionUnit = await this.getExecutionUnitById(id);
    
    executionUnit.resetLoad();
    const updatedUnit = await this.executionUnitRepository.save(executionUnit);
    
    this.logger.log(`执行单元负载重置: ${id}`);
    return updatedUnit;
  }

  /**
   * 手动标记执行单元为离线
   */
  async markAsOffline(id: string): Promise<ExecutionUnit> {
    const executionUnit = await this.getExecutionUnitById(id);
    
    executionUnit.markAsOffline();
    const updatedUnit = await this.executionUnitRepository.save(executionUnit);
    
    this.logger.log(`执行单元手动标记为离线: ${id}`);
    return updatedUnit;
  }

  /**
   * 手动标记执行单元为在线
   */
  async markAsOnline(id: string): Promise<ExecutionUnit> {
    const executionUnit = await this.getExecutionUnitById(id);
    
    executionUnit.markAsOnline();
    const updatedUnit = await this.executionUnitRepository.save(executionUnit);
    
    this.logger.log(`执行单元手动标记为在线: ${id}`);
    return updatedUnit;
  }
}