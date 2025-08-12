import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

// MySQL配置
export const getMySQLConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 3306),
  username: configService.get('DB_USERNAME', 'spider_user'),
  password: configService.get('DB_PASSWORD', 'spider_pass'),
  database: configService.get('DB_DATABASE', 'spider_db'),
  entities: [__dirname + '/../entities/mysql/*.entity{.ts,.js}'],
  synchronize: configService.get('NODE_ENV') === 'development',
  logging: configService.get('DB_LOGGING', false),
  timezone: '+08:00',
  charset: 'utf8mb4',
  extra: {
    connectionLimit: 10,
  },
});

// MongoDB配置
export const getMongoConfig = (configService: ConfigService): MongooseModuleOptions => ({
  uri: configService.get(
    'MONGO_URI',
    'mongodb://admin:admin123@localhost:27017/spider_logs?authSource=admin'
  ),
});

// Redis配置
export const getRedisConfig = (configService: ConfigService) => ({
  host: configService.get('REDIS_HOST', 'localhost'),
  port: configService.get('REDIS_PORT', 6379),
  password: configService.get('REDIS_PASSWORD'),
  db: configService.get('REDIS_DB', 0),
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
});