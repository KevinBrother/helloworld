import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskModule } from './modules/task/task.module';
import { ExecutionUnitModule } from './modules/execution-unit/execution-unit.module';
import { databaseConfigFactory } from './config/database.config';
import { appConfig } from './config/app.config';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    
    // 数据库模块
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfigFactory,
      inject: [ConfigService],
    }),
    
    // 业务模块
    TaskModule,
    ExecutionUnitModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}