# @crawler/shared-types

共享的 TypeScript 类型定义包，用于 Crawler 项目的前端和后端。

## 安装

```bash
npm install @crawler/shared-types
```

## 使用

```typescript
import { ApiResponse, CrawlRequest, CrawlResponse } from '@crawler/shared-types';

// 使用共享类型
const response: ApiResponse<CrawlResponse> = {
  success: true,
  data: {
    sessionId: 'session-123',
    status: 'completed'
  }
};
```

## 包含的类型

- `ApiResponse<T>` - 统一的 API 响应格式
- `CrawlRequest` - 爬虫请求参数
- `CrawlResponse` - 爬虫响应数据
- `CrawlSession` - 爬虫会话信息
- `MediaFileInfo` - 媒体文件信息
- `LinkInfo` - 链接信息
- `PageData` - 页面数据
- 更多类型定义...

## 开发

```bash
# 构建类型定义
npm run build

# 清理构建产物
npm run clean
```