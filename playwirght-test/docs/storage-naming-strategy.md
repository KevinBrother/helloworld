# 爬虫数据存储最佳实践 - 命名策略方案

## 概述

本文档提供了一套完整的爬虫数据存储命名策略，旨在提高数据组织性、可维护性和查询效率。

## 当前问题分析

### 现状

- 所有数据存储在单一桶 `crawler-data` 中
- 文件名使用简单的 base64 编码 + 时间戳
- 缺乏层次结构和分类
- 难以按域名、日期、深度等维度查询

### 问题

1. **可读性差**：文件名无法直观识别内容
2. **查询困难**：无法快速定位特定网站或时间段的数据
3. **维护复杂**：清理和管理数据困难
4. **扩展性差**：随着数据增长，管理成本急剧上升

## 推荐的命名策略

### 1. 桶（Bucket）命名策略

#### 按功能分桶

```
crawler-pages/          # 页面内容数据
crawler-screenshots/    # 页面截图
crawler-metadata/       # 元数据和索引
crawler-logs/          # 爬取日志
crawler-temp/          # 临时文件
```

#### 无需按环境分桶

### 2. 目录结构策略

#### 按域名 + 日期分层

```
crawler-pages/
├── domain/
│   ├── wikipedia.org/
│   │   ├── 2025/
│   │   │   ├── 01/
│   │   │   │   ├── 13/
│   │   │   │   │   ├── pages/
│   │   │   │   │   └── index/
│   │   │   │   └── 14/
│   │   │   └── 02/
│   │   └── 2024/
│   ├── httpbin.org/
│   └── example.com/
└── batch/
    ├── batch-001/
    └── batch-002/
```

### 3. 文件命名策略

#### 页面内容文件

```
格式：{depth}-{sequence}-{url_hash}-{timestamp}.json
示例：
- 0-001-a1b2c3d4-20250113T061410Z.json  # 深度0，序号001
- 1-045-e5f6g7h8-20250113T061510Z.json  # 深度1，序号045
- 2-012-i9j0k1l2-20250113T061610Z.json  # 深度2，序号012
```

#### 截图文件

```
格式：{depth}-{sequence}-{url_hash}-{timestamp}.png
示例：
- 0-001-a1b2c3d4-20250113T061410Z.png
- 1-045-e5f6g7h8-20250113T061510Z.png
```

#### 索引文件

```
格式：index-{date}.json
示例：
- index-20250113.json  # 当日爬取的所有页面索引
- index-20250113-wikipedia.json  # 当日特定域名的索引
```

### 4. 元数据策略

#### URL哈希映射

```json
{
  "url_mappings": {
    "a1b2c3d4": {
      "original_url": "https://en.wikipedia.org/wiki/Python_(programming_language)",
      "domain": "wikipedia.org",
      "path": "/wiki/Python_(programming_language)",
      "crawled_at": "2025-01-13T06:14:10Z",
      "depth": 0,
      "sequence": 1,
      "file_path": "domain/wikipedia.org/2025/01/13/pages/0-001-a1b2c3d4-20250113T061410Z.json"
    }
  }
}
```

#### 爬取会话索引

```json
{
  "session_id": "session-20250113-061400",
  "start_time": "2025-01-13T06:14:00Z",
  "end_time": "2025-01-13T06:20:00Z",
  "base_url": "https://en.wikipedia.org/wiki/Python_(programming_language)",
  "config": {
    "max_depth": 3,
    "max_pages": 20,
    "take_screenshots": false
  },
  "statistics": {
    "total_pages": 20,
    "pages_by_depth": {
      "0": 1,
      "1": 17,
      "2": 2
    },
    "domains_crawled": ["wikipedia.org"]
  },
  "files": [
    "domain/wikipedia.org/2025/01/13/pages/0-001-a1b2c3d4-20250113T061410Z.json",
    "domain/wikipedia.org/2025/01/13/pages/1-002-e5f6g7h8-20250113T061510Z.json"
  ]
}
```

## 实施建议

### 阶段1：基础重构

1. 创建新的桶结构
2. 修改文件命名逻辑
3. 实现基本的目录分层

### 阶段2：索引优化

1. 添加URL映射表
2. 实现会话索引
3. 添加查询接口

## 优势

1. **可读性强**：文件名和路径直观易懂
2. **查询高效**：支持按域名、日期、深度等维度快速查询
3. **维护简单**：清晰的组织结构便于管理
4. **扩展性好**：支持大规模数据存储

### 代码修改

1. 修改MinIO服务的存储逻辑
2. 更新文件命名规则
3. 添加索引生成功能

## 配置示例

```typescript
// 存储配置
export const StorageConfig = {
  buckets: {
    pages: 'crawler-pages',
    screenshots: 'crawler-screenshots', 
    metadata: 'crawler-metadata',
    logs: 'crawler-logs'
  },
  naming: {
    pageFile: '{depth}-{sequence:03d}-{urlHash}-{timestamp}.json',
    screenshotFile: '{depth}-{sequence:03d}-{urlHash}-{timestamp}.png',
    indexFile: 'index-{date}.json'
  },
  structure: {
    byDomain: true,
    byDate: true,
    dateFormat: 'YYYY/MM/DD'
  }
};
```

这套命名策略将大大提升爬虫数据的组织性和可维护性，为后续的数据分析和处理奠定良好基础。
