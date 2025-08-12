// 此文件由脚本自动生成，请勿手动修改
// Generated at: 2025-08-12T11:12:28.516Z

export interface LoginDto {
  /** 用户名或邮箱 */
  username: string;
  /** 密码 */
  password: string;
}

export interface RegisterDto {
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email: string;
  /** 密码 */
  password: string;
  /** 昵称 */
  nickname?: string;
}

export interface CreateUserDto {
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email: string;
  /** 密码 */
  password: string;
  /** 昵称 */
  nickname?: string;
  /** 用户角色 */
  role?: 'admin' | 'user';
}

export interface UpdateUserDto {
  /** 用户名 */
  username?: string;
  /** 邮箱 */
  email?: string;
  /** 密码 */
  password?: string;
  /** 昵称 */
  nickname?: string;
  /** 头像URL */
  avatar?: string;
  /** 用户角色 */
  role?: 'admin' | 'user';
  /** 用户状态 */
  status?: 'active' | 'inactive' | 'banned';
}

export interface CrawlRequestDto {
  /** 目标URL */
  url: string;
  /** 数据提取规则 */
  extractionRules?: any[];
  /** 等待页面加载策略 */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  /** 等待特定选择器出现 */
  waitForSelector?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否截图 */
  takeScreenshot?: boolean;
  /** 自定义JavaScript脚本 */
  customScript?: string;
  /** 反检测配置 */
  antiDetectionConfig?: object;
  /** 是否发现API接口 */
  discoverApis?: boolean;
  /** 是否下载媒体文件 */
  downloadMedia?: boolean;
  /** 媒体文件类型过滤器 */
  mediaTypes?: string[];
}

export interface CrawlResultDto {
  /** 是否成功 */
  success: boolean;
  /** 目标URL */
  url: string;
  /** 提取的数据 */
  data?: object;
  /** 页面信息 */
  pageInfo?: object;
  /** 截图（Base64编码） */
  screenshot?: string;
  /** 错误信息 */
  error?: string;
  /** 执行时间戳 */
  timestamp: string;
  /** 执行耗时（毫秒） */
  executionTime: number;
  /** 发现的API接口 */
  discoveredApis?: string[];
  /** 下载的媒体文件 */
  mediaFiles?: string[];
}

export interface PageAnalysisDto {
  /** 页面URL */
  url: string;
  /** 页面标题 */
  title: string;
  /** 页面描述 */
  description?: string;
  /** 页面类型 */
  pageType: string;
  /** 主要内容元素 */
  mainElements: string[];
  /** 表单信息 */
  forms?: string[];
  /** 链接信息 */
  links?: string[];
  /** 图片信息 */
  images?: string[];
  /** 检测到的反爬虫机制 */
  antiCrawlerMechanisms?: string[];
  /** 建议的提取规则 */
  suggestedRules?: string[];
  /** 分析时间戳 */
  timestamp: string;
  /** 分析耗时（毫秒） */
  analysisTime: number;
}

export interface CreateCrawlConfigDto {
  /** 配置名称 */
  name: string;
  /** 配置描述 */
  description?: string;
  /** 起始URL */
  startUrl: string;
  /** 允许的域名列表 */
  allowedDomains?: string[];
  /** 禁止的域名列表 */
  deniedDomains?: string[];
  /** URL模式列表 */
  urlPatterns?: string[];
  /** 最大爬取深度 */
  maxDepth?: number;
  /** 最大页面数 */
  maxPages?: number;
  /** 请求延迟(毫秒) */
  requestDelay?: number;
  /** 请求超时(毫秒) */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** HTTP方法 */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** 请求头 */
  headers?: object;
  /** Cookies */
  cookies?: object;
  /** 用户代理 */
  userAgent?: string;
  /** 是否使用代理 */
  useProxy?: boolean;
  /** 代理配置 */
  proxyConfig?: object;
  /** 是否启用JavaScript */
  enableJavaScript?: boolean;
  /** 用户ID */
  userId?: number;
}

export interface CrawlConfig {

}

export interface UpdateCrawlConfigDto {
  /** 配置名称 */
  name?: string;
  /** 配置描述 */
  description?: string;
  /** 起始URL */
  startUrl?: string;
  /** 允许的域名列表 */
  allowedDomains?: string[];
  /** 禁止的域名列表 */
  deniedDomains?: string[];
  /** URL模式列表 */
  urlPatterns?: string[];
  /** 最大爬取深度 */
  maxDepth?: number;
  /** 最大页面数 */
  maxPages?: number;
  /** 请求延迟(毫秒) */
  requestDelay?: number;
  /** 请求超时(毫秒) */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** HTTP方法 */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** 请求头 */
  headers?: object;
  /** Cookies */
  cookies?: object;
  /** 用户代理 */
  userAgent?: string;
  /** 是否使用代理 */
  useProxy?: boolean;
  /** 代理配置 */
  proxyConfig?: object;
  /** 是否启用JavaScript */
  enableJavaScript?: boolean;
  /** 用户ID */
  userId?: number;
}

export interface CrawlerConfigDto {
  /** 目标URL */
  url: string;
  /** 数据提取规则 */
  extractRules?: object;
  /** 等待策略 */
  waitStrategy?: object;
  /** 超时时间(毫秒) */
  timeout?: number;
  /** 是否截图 */
  screenshot?: boolean;
  /** 自定义脚本 */
  customScript?: string;
  /** 反检测配置 */
  antiDetection?: object;
  /** 是否发现API */
  discoverApis?: boolean;
  /** 是否下载媒体文件 */
  downloadMedia?: boolean;
}

export interface ScheduleConfigDto {
  /** Cron表达式 */
  cronExpression?: string;
  /** 间隔时间(毫秒) */
  interval?: number;
  /** 开始时间 */
  startTime?: string;
  /** 结束时间 */
  endTime?: string;
  /** 最大执行次数 */
  maxExecutions?: number;
}

export interface CreateTaskDto {
  /** 任务名称 */
  name: string;
  /** 任务描述 */
  description?: string;
  /** 任务类型 */
  type: 'single_page' | 'multi_page' | 'sitemap' | 'api';
  /** 爬虫配置 */
  config: any;
  /** 调度类型 */
  scheduleType?: 'once' | 'cron' | 'interval';
  /** 调度配置 */
  scheduleConfig?: any;
  /** 是否立即执行 */
  executeImmediately?: boolean;
  /** 优先级 */
  priority?: number;
  /** 标签 */
  tags?: string;
  /** 用户ID */
  userId?: number;
}

export interface Task {

}

export interface UpdateTaskDto {
  /** 任务名称 */
  name?: string;
  /** 任务描述 */
  description?: string;
  /** 任务类型 */
  type?: 'single_page' | 'multi_page' | 'sitemap' | 'api';
  /** 爬虫配置 */
  config?: any;
  /** 调度类型 */
  scheduleType?: 'once' | 'cron' | 'interval';
  /** 调度配置 */
  scheduleConfig?: any;
  /** 是否立即执行 */
  executeImmediately?: boolean;
  /** 优先级 */
  priority?: number;
  /** 标签 */
  tags?: string;
  /** 用户ID */
  userId?: number;
}