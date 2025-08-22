/**
 * 应用配置
 */
export const appConfig = () => ({
  // 应用基础配置
  app: {
    name: process.env.APP_NAME || 'Task Model System',
    version: process.env.APP_VERSION || '1.0.0',
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || 'api',
  },
  
  // 数据库配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'taskmanager',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'task_management',
  },
  
  // Redis配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  
  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '7', 10),
    maxSize: process.env.LOG_MAX_SIZE || '10m',
  },
  
  // 任务配置
  task: {
    defaultMaxRetries: parseInt(process.env.TASK_DEFAULT_MAX_RETRIES || '3', 10),
    defaultTimeout: parseInt(process.env.TASK_DEFAULT_TIMEOUT || '300000', 10), // 5分钟
    heartbeatInterval: parseInt(process.env.TASK_HEARTBEAT_INTERVAL || '30000', 10), // 30秒
    cleanupInterval: parseInt(process.env.TASK_CLEANUP_INTERVAL || '3600000', 10), // 1小时
  },
  
  // 执行单元配置
  executionUnit: {
    defaultCapacity: parseInt(process.env.EXECUTION_UNIT_DEFAULT_CAPACITY || '1', 10),
    heartbeatTimeout: parseInt(process.env.EXECUTION_UNIT_HEARTBEAT_TIMEOUT || '60000', 10), // 1分钟
    offlineThreshold: parseInt(process.env.EXECUTION_UNIT_OFFLINE_THRESHOLD || '180000', 10), // 3分钟
  },
  
  // API配置
  api: {
    rateLimit: {
      ttl: parseInt(process.env.API_RATE_LIMIT_TTL || '60', 10),
      limit: parseInt(process.env.API_RATE_LIMIT_COUNT || '100', 10),
    },
    cors: {
      origin: process.env.API_CORS_ORIGIN || '*',
      credentials: process.env.API_CORS_CREDENTIALS === 'true',
    },
  },
  
  // Swagger配置
  swagger: {
    title: process.env.SWAGGER_TITLE || 'Task Model System API',
    description: process.env.SWAGGER_DESCRIPTION || 'API documentation for Task Model System',
    version: process.env.SWAGGER_VERSION || '1.0.0',
    path: process.env.SWAGGER_PATH || 'api-docs',
  },
});

/**
 * 验证必需的环境变量
 */
export function validateConfig() {
  const requiredEnvVars = [
    'DB_HOST',
    'DB_USERNAME', 
    'DB_PASSWORD',
    'DB_DATABASE'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

/**
 * 获取配置值的辅助函数
 */
export function getConfig<T = any>(path: string, defaultValue?: T): T {
  const config = appConfig();
  const keys = path.split('.');
  let value = config;
  
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) {
      return defaultValue as T;
    }
  }
  
  return value as T;
}

/**
 * 获取应用配置（兼容性函数）
 */
export function getAppConfig() {
  const config = appConfig();
  return {
    port: config.app.port,
    host: '0.0.0.0',
    nodeEnv: config.app.env,
    apiPrefix: config.app.apiPrefix,
    corsEnabled: true,
    corsOrigins: [config.api.cors.origin],
  };
}