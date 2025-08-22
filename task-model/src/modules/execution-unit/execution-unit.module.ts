import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExecutionUnitController } from './execution-unit.controller';
import { ExecutionUnitService } from './execution-unit.service';
import { ExecutionUnit } from './entities/execution-unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExecutionUnit]),
  ],
  controllers: [ExecutionUnitController],
  providers: [ExecutionUnitService],
  exports: [ExecutionUnitService, TypeOrmModule],
})
export class ExecutionUnitModule {}