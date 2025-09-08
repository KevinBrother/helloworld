# Crawlee 测试驱动学习项目

## 项目简介

这是一个纯测试驱动的 Crawlee 学习项目。通过编写和运行测试用例来学习和验证 Crawlee 框架的各种功能特性，而不是构建实际的爬虫应用。

## 🎯 学习目标

- 掌握 Crawlee 的核心 API 和功能
- 理解爬虫的并发控制和性能优化
- 学会使用 Playwright 进行浏览器自动化
- 熟悉数据存储、缓存和去重机制
- 通过 TDD 方式深度学习框架特性

## 🏗️ 测试架构

```
tests/
├── helpers/           # 测试工具类
│   ├── mock-server.ts # Mock HTTP 服务器
│   └── test-utils.ts  # 测试辅助函数
├── unit/             # 单元测试
│   ├── basic-crawler.test.ts          # 基础爬虫功能
│   ├── browser-automation.test.ts     # 浏览器自动化
│   ├── performance-optimization.test.ts # 性能优化
│   └── deduplication-caching.test.ts  # 去重和缓存
├── integration/      # 集成测试
│   └── full-crawl-flow.test.ts       # 完整爬取流程
└── setup.test.ts     # 环境设置测试
```

## 🚀 快速开始

### 安装依赖
```bash
pnpm install
```

### 运行所有测试
```bash
pnpm test
```

### 运行特定测试文件
```bash
# 基础爬虫功能测试
pnpm test:run tests/unit/basic-crawler.test.ts

# 浏览器自动化测试
pnpm test:run tests/unit/browser-automation.test.ts

# 性能优化测试
pnpm test:run tests/unit/performance-optimization.test.ts

# 去重和缓存测试
pnpm test:run tests/unit/deduplication-caching.test.ts

# 完整流程集成测试
pnpm test:run tests/integration/full-crawl-flow.test.ts
```

### 监视模式（开发时使用）
```bash
pnpm test:watch
```

### 生成覆盖率报告
```bash
pnpm test:coverage
```

## 📚 测试内容详解

### 1. 基础爬虫功能 (basic-crawler.test.ts)
- ✅ 页面请求和响应处理
- ✅ HTML 内容提取和解析
- ✅ 链接发现和跟踪
- ✅ 请求队列管理
- ✅ 数据存储（Dataset）

### 2. 浏览器自动化 (browser-automation.test.ts)
- ✅ 无头浏览器操作
- ✅ JavaScript 渲染处理
- ✅ 表单填写和提交
- ✅ 页面截图功能
- ✅ Cookie 和会话管理

### 3. 性能优化 (performance-optimization.test.ts)
- ✅ 并发请求控制
- ✅ 请求限流和速率控制
- ✅ 内存使用优化
- ✅ 错误重试机制
- ✅ 会话池缓存策略

### 4. 去重和缓存 (deduplication-caching.test.ts)
- ✅ URL 自动去重机制
- ✅ 页面内容缓存复用
- ✅ 请求指纹去重
- ✅ 智能缓存策略

### 5. 完整爬取流程 (full-crawl-flow.test.ts)
- ✅ 电商网站完整爬取
- ✅ 数据存储和统计
- ✅ 错误处理和重试
- ✅ 爬取报告生成

## 🔧 测试工具说明

### MockServer
提供可控的测试环境，模拟各种网站场景：
```typescript
const mockServer = new MockServer({
  port: 3000,
  responses: {
    '/product/1': {
      status: 200,
      body: '<html>...</html>'
    }
  }
});
```

### TestCrawlerHelper
简化测试设置和清理：
```typescript
await withMockServer(async (helper) => {
  const crawler = new PlaywrightCrawler({...});
  await crawler.run([helper.getServerUrl()]);
});
```

## 📊 测试运行示例

运行基础功能测试：
```bash
$ pnpm test:run tests/unit/basic-crawler.test.ts

✓ 基础爬虫功能 (Core)
  ✓ 基本页面请求和响应处理
    ✓ 应该能够访问页面并获取标题
    ✓ 应该能够处理多个URL请求
  ✓ HTML内容提取和解析
    ✓ 应该能够提取页面元素内容
    ✓ 应该能够提取产品页面信息
  ✓ 链接发现和跟踪
    ✓ 应该能够发现并跟踪页面链接
    ✓ 应该能够过滤和限制跟踪的链接
  ✓ 请求队列管理
    ✓ 应该能够手动管理请求队列
    ✓ 应该能够处理请求优先级
  ✓ 数据存储 (JSON/CSV格式)
    ✓ 应该能够保存数据到Dataset
    ✓ 应该能够获取数据集信息
    ✓ 应该能够处理大量数据

Test Files  1 passed (1)
Tests      11 passed (11)
Duration   4.19s
```

## 📈 学习路径建议

### 阶段一：基础功能 (1-2天)
1. 运行 `tests/setup.test.ts` 熟悉环境
2. 学习 `tests/unit/basic-crawler.test.ts` 的基础API
3. 理解 PlaywrightCrawler、Dataset、RequestQueue 使用

### 阶段二：进阶功能 (2-3天)
1. 运行 `tests/unit/browser-automation.test.ts` 学习浏览器控制
2. 运行 `tests/unit/performance-optimization.test.ts` 学习性能调优
3. 掌握并发控制、重试机制、会话管理

### 阶段三：高级特性 (2-3天)
1. 运行 `tests/unit/deduplication-caching.test.ts` 学习去重缓存
2. 运行 `tests/integration/full-crawl-flow.test.ts` 理解完整流程
3. 学习实际应用场景的处理方法

## 🎨 自定义测试

你可以基于现有的测试框架编写自己的测试用例：

```typescript
import { describe, it, expect } from 'vitest';
import { PlaywrightCrawler } from 'crawlee';
import { withMockServer } from '../helpers/test-utils';

describe('我的自定义测试', () => {
  it('应该能够处理特定场景', async () => {
    await withMockServer(async (helper) => {
      const crawler = new PlaywrightCrawler({
        requestHandler: async ({ page, request }) => {
          // 你的测试逻辑
        }
      });
      
      await crawler.run([helper.getServerUrl()]);
      // 验证结果
    });
  });
});
```

## 🔍 调试技巧

1. **启用详细日志**：设置环境变量 `DEBUG=crawlee:*`
2. **使用监视模式**：`pnpm test:watch` 实时查看测试结果
3. **单独运行测试**：使用 `.only()` 只运行特定测试
4. **查看浏览器**：设置 `headless: false` 观察浏览器行为

## 📝 注意事项

- 所有测试都在隔离环境中运行，不会影响真实网站
- 测试会自动清理创建的数据，无需手动清理
- Mock 服务器模拟各种网站场景，确保测试稳定性
- 测试覆盖了 Crawlee 的核心功能，但不包括所有边缘情况

## 🤝 贡献

欢迎添加更多测试用例来覆盖更多的 Crawlee 功能！请遵循现有的测试结构和命名约定。

## 📚 相关资源

- [Crawlee 官方文档](https://crawlee.dev/)
- [Playwright 文档](https://playwright.dev/)
- [Vitest 文档](https://vitest.dev/)
- [功能实现清单](./FEATURE_CHECKLIST.md)