# Service 测试方案

## 项目概述

本项目是一个基于 NestJS 的网站爬虫系统，使用 Vitest 作为测试框架。当前项目结构中包含多个 service 层，需要为这些服务添加完整的测试覆盖。

## 当前 Service 结构

```
src/
├── core/                      # 核心基础服务
│   ├── browser/
│   │   └── browser.service.ts
│   └── storage/
│       └── storage.service.ts
└── services/                  # 业务服务
    ├── content/
    │   └── content-extractor.service.ts
    ├── crawler/
    │   ├── link-manager.service.ts
    │   └── website-crawler.service.ts
    └── media/
        ├── media-detector.service.ts
        ├── media-downloader.service.ts
        └── media-storage.service.ts
```

## 测试框架配置

项目已配置 Vitest 测试框架：

- **测试框架**: Vitest
- **测试文件模式**: `*.spec.ts` 或 `*.test.ts`
- **测试根目录**: `src/`
- **覆盖率报告**: 内置支持
- **NestJS 测试工具**: `@nestjs/testing`

## 测试方案

### 1. 单元测试 (Unit Tests)

#### 1.1 测试文件组织结构

建议采用就近原则，在每个 service 文件旁边创建对应的测试文件：

```
src/
├── core/
│   ├── browser/
│   │   ├── browser.service.ts
│   │   └── browser.service.spec.ts
│   └── storage/
│       ├── storage.service.ts
│       └── storage.service.spec.ts
└── services/
    ├── content/
    │   ├── content-extractor.service.ts
    │   └── content-extractor.service.spec.ts
    ├── crawler/
    │   ├── link-manager.service.ts
    │   ├── link-manager.service.spec.ts
    │   ├── website-crawler.service.ts
    │   └── website-crawler.service.spec.ts
    └── media/
        ├── media-detector.service.ts
        ├── media-detector.service.spec.ts
        ├── media-downloader.service.ts
        ├── media-downloader.service.spec.ts
        ├── media-storage.service.ts
        └── media-storage.service.spec.ts
```

#### 1.2 测试模板结构

每个 service 测试文件应包含以下基本结构：

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServiceName } from './service-name.service';

describe('ServiceName', () => {
  let service: ServiceName;
  let module: TestingModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceName,
        // Mock dependencies
      ],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('基础功能测试', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('核心方法测试', () => {
    // 具体方法测试
  });

  describe('异常处理测试', () => {
    // 异常情况测试
  });
});
```

### 2. 集成测试 (Integration Tests)

#### 2.1 测试目录结构

```
test/
├── integration/
│   ├── services/
│   │   ├── crawler-integration.spec.ts
│   │   ├── media-integration.spec.ts
│   │   └── content-integration.spec.ts
│   └── e2e/
│       └── crawler-workflow.e2e-spec.ts
└── fixtures/
    ├── test-data/
    └── mock-responses/
```

### 3. 具体 Service 测试策略

#### 3.1 Core Services 测试重点

##### 3.1.1 BrowserService 测试重点

- **浏览器生命周期**: 启动、关闭、重启
- **页面爬取**: HTML获取、标题提取、状态码处理
- **截图功能**: 截图生成、格式验证
- **错误处理**: 网络错误、页面加载失败
- **资源管理**: 内存泄漏防护、连接池管理
- **配置选项**: UserAgent设置、无头模式

##### 3.1.2 StorageService 测试重点

- **MinIO连接**: 客户端初始化、连接验证、重连机制
- **存储桶管理**: 创建、检查、权限设置
- **文件操作**: 保存、读取、删除、列表
- **路径生成**: URL到存储路径的映射
- **元数据管理**: 索引更新、统计信息
- **错误处理**: 网络异常、存储空间不足

#### 3.2 Business Services 测试重点

##### 3.2.1 WebsiteCrawlerService 测试重点

- **会话管理**: 创建、获取、停止会话
- **爬取流程**: URL 处理、页面抓取、深度控制
- **异步处理**: 并发控制、错误处理
- **安全限制**: 页面数量、时间限制

##### 3.2.2 MediaStorageService 测试重点

- **文件管理**: 保存、获取、搜索媒体文件
- **数据统计**: 文件统计、类型分组
- **去重逻辑**: 重复文件处理
- **元数据处理**: 文件信息存储

##### 3.2.3 ContentExtractorService 测试重点

- **内容提取**: HTML 解析、文本提取
- **链接处理**: 相对链接转换、链接过滤
- **数据清洗**: 内容格式化、特殊字符处理

### 4. Mock 策略

#### 4.1 外部依赖 Mock

- **BrowserService**: Mock Playwright 浏览器操作
- **StorageService**: Mock MinIO 存储操作
- **HTTP 请求**: Mock axios 网络请求

#### 4.2 Mock 工具推荐

```typescript
// 使用 Vitest Mock
vi.mock('playwright');
vi.mock('minio');

// 使用 NestJS Testing 工具
const mockStorageService = {
  saveFile: vi.fn(),
  getFile: vi.fn(),
};
```

### 5. 测试数据管理

#### 5.1 测试夹具 (Fixtures)

```
test/fixtures/
├── html-samples/
│   ├── simple-page.html
│   ├── complex-page.html
│   └── media-rich-page.html
├── mock-responses/
│   ├── api-responses.json
│   └── error-responses.json
└── test-urls.json
```

#### 5.2 测试数据生成

```typescript
// 测试数据工厂
export class TestDataFactory {
  static createCrawlRequest(overrides?: Partial<CrawlRequest>): CrawlRequest {
    return {
      startUrl: 'https://example.com',
      maxDepth: 2,
      maxPages: 10,
      ...overrides,
    };
  }

  static createMediaFileInfo(overrides?: Partial<MediaFileInfo>): MediaFileInfo {
    return {
      fileName: 'test-image.jpg',
      originalUrl: 'https://example.com/image.jpg',
      fileSize: 1024,
      mimeType: 'image/jpeg',
      ...overrides,
    };
  }
}
```

### 6. 测试执行策略

#### 6.1 测试脚本配置

在 `package.json` 中配置的测试脚本：

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:cov": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

#### 6.2 测试分类执行

```bash
# 运行所有测试
npm run test

# 运行特定 service 测试
npm run test services/crawler

# 运行覆盖率测试
npm run test:cov

# 监听模式
npm run test:watch

# UI 模式
npm run test:ui
```

### 7. 覆盖率目标

- **语句覆盖率**: ≥ 80%
- **分支覆盖率**: ≥ 75%
- **函数覆盖率**: ≥ 85%
- **行覆盖率**: ≥ 80%

### 8. CI/CD 集成

#### 8.1 GitHub Actions 配置示例

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:cov
      - uses: codecov/codecov-action@v3
```

### 9. 实施步骤

#### 阶段一：基础测试框架搭建
1. 创建测试工具类和 Mock 工厂
2. 建立测试数据夹具
3. 配置测试环境

#### 阶段二：核心基础服务测试
1. BrowserService 单元测试
2. StorageService 单元测试

#### 阶段三：业务核心服务测试
1. WebsiteCrawlerService 单元测试
2. MediaStorageService 单元测试
3. ContentExtractorService 单元测试

#### 阶段四：辅助业务服务测试
1. LinkManagerService 单元测试
2. MediaDetectorService 单元测试
3. MediaDownloaderService 单元测试

#### 阶段五：集成测试
1. Service 间集成测试
2. 端到端工作流测试
3. 性能测试

### 10. 最佳实践

1. **测试隔离**: 每个测试用例独立，不依赖其他测试
2. **Mock 合理**: 只 Mock 外部依赖，不过度 Mock
3. **测试命名**: 使用描述性的测试名称
4. **边界测试**: 测试边界条件和异常情况
5. **性能考虑**: 避免测试中的真实网络请求和文件操作

### 11. Vitest 配置

#### 11.1 安装依赖

```bash
# 安装 Vitest 相关依赖
npm install -D vitest @vitest/ui c8

# 如果需要 Jest 兼容性
npm install -D @vitest/jest-compat
```

#### 11.2 配置文件

创建 `vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

#### 11.3 测试设置文件

创建 `test/setup.ts`：

```typescript
import { vi } from 'vitest';

// 全局 Mock 设置
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn(),
  },
}));

vi.mock('minio', () => ({
  Client: vi.fn(),
}));

// 环境变量设置
process.env.NODE_ENV = 'test';
```

### 12. 工具推荐

- **测试框架**: Vitest (已配置)
- **Mock 库**: Vitest 内置 Mock (vi)
- **测试工具**: @nestjs/testing
- **覆盖率报告**: c8 (Vitest 内置)
- **测试数据**: faker.js (可选)
- **HTTP Mock**: nock (可选)
- **UI 界面**: @vitest/ui

## 总结

通过以上测试方案，可以为项目中的所有 service（包括 core 和 business services）建立完整的测试覆盖，确保代码质量和系统稳定性。建议按阶段实施，优先覆盖核心基础服务，然后逐步完善业务服务的测试。

Vitest 作为现代化的测试框架，提供了出色的性能、开箱即用的 TypeScript 支持和直观的开发体验。结合 NestJS 的测试工具，能够构建高效可靠的测试环境，确保项目的长期可维护性。