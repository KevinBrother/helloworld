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

#### 按域名 + 日期 + URL路径分层（混合方案）

```
crawler-pages/
├── domain/
│   ├── wikipedia.org/
│   │   ├── 2025/
│   │   │   ├── 01/
│   │   │   │   ├── 13/
│   │   │   │   │   ├── pages/
│   │   │   │   │   │   ├── wiki/
│   │   │   │   │   │   │   ├── Python_(programming_language)/
│   │   │   │   │   │   │   │   ├── index.json          # 页面内容
│   │   │   │   │   │   │   │   ├── index.png           # 页面截图
│   │   │   │   │   │   │   │   └── metadata.json       # 页面元数据
│   │   │   │   │   │   │   └── Machine_learning/
│   │   │   │   │   │   │       ├── index.json
│   │   │   │   │   │   │       ├── index.png
│   │   │   │   │   │   │       └── metadata.json
│   │   │   │   │   │   └── _root/                      # 根路径页面
│   │   │   │   │   │       ├── index.json
│   │   │   │   │   │       ├── index.png
│   │   │   │   │   │       └── metadata.json
│   │   │   │   │   ├── sessions/
│   │   │   │   │   │   ├── session-me9mkkrv-h0hsi7.json
│   │   │   │   │   │   └── session-abc123def-456ghi.json
│   │   │   │   │   └── index/
│   │   │   │   │       ├── url_index.json              # URL到路径映射
│   │   │   │   │       ├── title_index.json            # 标题到路径映射
│   │   │   │   │       └── hash_index.json             # 哈希到路径映射
│   │   │   │   └── 14/
│   │   │   └── 02/
│   │   └── 2024/
│   ├── httpbin.org/
│   │   ├── 2025/
│   │   │   └── 01/
│   │   │       └── 13/
│   │   │           ├── pages/
│   │   │           │   └── _root/
│   │   │           │       ├── index.json
│   │   │           │       └── metadata.json
│   │   │           ├── sessions/
│   │   │           └── index/
│   └── example.com/
│       └── 2025/
│           └── 01/
│               └── 13/
│                   ├── pages/
│                   │   └── _root/
│                   │       ├── index.json
│                   │       └── metadata.json
│                   ├── sessions/
│                   └── index/
└── batch/
    ├── batch-001/
    └── batch-002/
```

### 3. 文件命名策略（混合方案）

#### URL路径映射 + 固定文件名

采用URL路径映射作为目录结构，使用固定的文件名，通过多重索引实现快速查找。

#### 页面文件命名

```
固定文件名：
- index.json          # 页面内容文件
- index.png           # 页面截图文件  
- metadata.json       # 页面元数据文件
```

#### URL路径安全化处理

```typescript
// URL路径到目录路径的映射规则
function sanitizePath(urlPath: string): string {
  return urlPath
    .replace(/^\//g, '')           // 移除开头的 /
    .replace(/\/$/, '')           // 移除结尾的 /
    .replace(/[<>:"|?*]/g, '_')   // 替换非法字符
    .replace(/\.{2,}/g, '_')      // 替换连续的点
    .replace(/\s+/g, '_')         // 替换空格
    .split('/')
    .map(segment => {
      if (segment === '' || segment === '.' || segment === '..') {
        return '_';
      }
      return segment.length > 100 ? segment.substring(0, 100) + '_hash' : segment;
    })
    .join('/');
}

// 特殊路径处理
function getDirectoryPath(url: string): string {
  const urlObj = new URL(url);
  const path = urlObj.pathname;
  
  if (path === '/' || path === '') {
    return '_root';  // 根路径特殊处理
  }
  
  return sanitizePath(path);
}
```

#### 索引文件命名

```
多重索引文件：
- url_index.json      # URL到路径的映射索引
- title_index.json    # 标题到路径的映射索引
- hash_index.json     # 哈希到路径的映射索引（兼容性）
```

#### 会话文件命名

```
格式：session-{sessionId}.json
示例：
- session-me9mkkrv-h0hsi7.json  # 会话元数据和配置
- session-abc123def-456ghi.json  # 另一个会话的元数据
```

### 4. 元数据策略（混合方案）

#### URL索引映射（url_index.json）

```json
{
  "version": "1.0",
  "generated_at": "2025-01-13T06:20:00Z",
  "mappings": {
    "https://en.wikipedia.org/wiki/Python_(programming_language)": {
      "storage_path": "domain/wikipedia.org/2025/01/13/pages/wiki/Python_(programming_language)/",
      "title": "Python (programming language) - Wikipedia",
      "crawled_at": "2025-01-13T06:14:10Z",
      "session_id": "me9mkkrv-h0hsi7",
      "depth": 0,
      "files": {
        "content": "index.json",
        "screenshot": "index.png",
        "metadata": "metadata.json"
      }
    },
    "https://en.wikipedia.org/wiki/Machine_learning": {
      "storage_path": "domain/wikipedia.org/2025/01/13/pages/wiki/Machine_learning/",
      "title": "Machine learning - Wikipedia",
      "crawled_at": "2025-01-13T06:15:30Z",
      "session_id": "me9mkkrv-h0hsi7",
      "depth": 1,
      "files": {
        "content": "index.json",
        "screenshot": "index.png",
        "metadata": "metadata.json"
      }
    }
  }
}
```

#### 反向路径索引（title_index.json）

```json
{
  "path_to_url": {
    "domain/wikipedia.org/2025/01/13/pages/wiki/Python_(programming_language)/": "https://en.wikipedia.org/wiki/Python_(programming_language)",
    "domain/wikipedia.org/2025/01/13/pages/wiki/Machine_learning/": "https://en.wikipedia.org/wiki/Machine_learning"
  },
  "title_to_url": {
    "python programming language wikipedia": "https://en.wikipedia.org/wiki/Python_(programming_language)",
    "machine learning wikipedia": "https://en.wikipedia.org/wiki/Machine_learning"
  }
}
```

#### 页面元数据文件（metadata.json）

```json
{
  "url": "https://en.wikipedia.org/wiki/Python_(programming_language)",
  "title": "Python (programming language) - Wikipedia",
  "domain": "wikipedia.org",
  "urlPath": "/wiki/Python_(programming_language)",
  "safePath": "wiki/Python_(programming_language)",
  "storagePath": "domain/wikipedia.org/2025/01/13/pages/wiki/Python_(programming_language)/",
  "files": {
    "content": "index.json",
    "screenshot": "index.png",
    "metadata": "metadata.json"
  },
  "crawledAt": "2025-01-13T06:14:10Z",
  "sessionId": "me9mkkrv-h0hsi7",
  "depth": 0,
  "parentUrl": null,
  "contentType": "text/html",
  "statusCode": 200,
  "size": {
    "content": 15420,
    "screenshot": 245680
  }
}
```

#### 爬取会话索引

```json
{
  "session_id": "me9mkkrv-h0hsi7",
  "start_time": "2025-01-13T06:14:00Z",
  "end_time": "2025-01-13T06:20:00Z",
  "base_url": "https://en.wikipedia.org/wiki/Python_(programming_language)",
  "domain": "wikipedia.org",
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
  "pages": [
    {
      "url": "https://en.wikipedia.org/wiki/Python_(programming_language)",
      "storage_path": "domain/wikipedia.org/2025/01/13/pages/wiki/Python_(programming_language)/",
      "depth": 0
    },
    {
      "url": "https://en.wikipedia.org/wiki/Machine_learning",
      "storage_path": "domain/wikipedia.org/2025/01/13/pages/wiki/Machine_learning/",
      "depth": 1
    }
  ],
  "storage_path": "domain/wikipedia.org/2025/01/13/sessions/session-me9mkkrv-h0hsi7.json"
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

## 优势（混合方案）

1. **URL可读性极强**：通过URL路径映射，文件路径直接反映原始URL结构
2. **查询高效**：支持按域名、日期、URL路径等维度快速查询
3. **维护简单**：清晰的组织结构便于管理，固定文件名避免命名冲突
4. **扩展性好**：支持大规模数据存储，URL路径自然分层
5. **会话管理优化**：sessions按domain组织，便于查找特定网站的爬取历史
6. **数据关联性强**：同一域名下的pages、sessions、index文件在同一目录结构中，便于关联查询
7. **多重索引支持**：URL索引、标题索引、路径索引提供多种查找方式
8. **文件系统友好**：URL路径安全化处理，兼容各种文件系统
9. **直观的文件识别**：从路径即可知道页面内容，无需查看元数据
10. **批量操作便利**：相同URL路径下的文件可以批量处理

### 代码修改

1. 修改MinIO服务的存储逻辑
2. 更新文件命名规则
3. 添加索引生成功能

## 配置示例（混合方案）

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
    // 固定文件名策略
    contentFile: 'index.json',
    screenshotFile: 'index.png',
    metadataFile: 'metadata.json',
    sessionFile: 'session-{sessionId}.json'
  },
  structure: {
    byDomain: true,
    byDate: true,
    byUrlPath: true,  // 新增：按URL路径映射
    dateFormat: 'YYYY/MM/DD',
    directories: {
      pages: 'pages',
      sessions: 'sessions',
      index: 'index'
    }
  },
  pathMapping: {
    enabled: true,
    maxPathLength: 200,
    maxSegmentLength: 100,
    reservedNames: ['_root', '_index', '_temp'],
    sanitizeRules: {
      replaceIllegalChars: true,
      limitSegmentLength: true,
      handleSpecialPaths: true
    }
  },
  indexing: {
    enabled: true,
    types: {
      urlIndex: 'url_index.json',      // URL到路径映射
      titleIndex: 'title_index.json',  // 标题到路径映射
      hashIndex: 'hash_index.json'     // 哈希到路径映射（兼容性）
    },
    updateInterval: 300000, // 5分钟
    batchSize: 1000
  },
  search: {
    enableFullText: true,
    enableFuzzy: true,
    maxResults: 100
  }
};

// URL路径映射配置
export const URLMappingConfig = {
  // 路径安全化配置
  sanitization: {
    illegalChars: /[<>:"|?*]/g,
    replacement: '_',
    maxSegmentLength: 100,
    specialPaths: {
      root: '_root',
      empty: '_empty',
      current: '_current',
      parent: '_parent'
    }
  },
  
  // 索引生成配置
  indexGeneration: {
    includeTitle: true,
    includePath: true,
    includeHash: true,
    normalizeTitle: true
  }
};
```

这套命名策略将大大提升爬虫数据的组织性和可维护性，为后续的数据分析和处理奠定良好基础。
