# 文件URL映射与可读性优化方案

## 问题分析

### 当前问题

1. **文件名不直观**：使用哈希值命名，无法直接看出原始URL
2. **查找困难**：需要先找到metadata.json才能知道文件对应的URL
3. **用户体验差**：特别是图片文件，完全无法识别内容来源
4. **管理复杂**：批量操作时无法快速识别文件

### 核心需求

1. 文件名应该包含URL信息
2. 保持文件系统兼容性
3. 支持快速查找和识别
4. 便于批量管理

## 解决方案

### 方案一：URL路径映射 + 元数据增强（推荐）

#### 1. 存储结构设计

```
crawler-pages/
├── domain/
│   ├── wikipedia.org/
│   │   ├── 2025/01/13/
│   │   │   ├── pages/
│   │   │   │   ├── wiki/
│   │   │   │   │   ├── Python_(programming_language)/
│   │   │   │   │   │   ├── index.json          # 主页面
│   │   │   │   │   │   ├── index.png           # 主页面截图
│   │   │   │   │   │   └── metadata.json       # 页面元数据
│   │   │   │   │   └── Machine_learning/
│   │   │   │   │       ├── index.json
│   │   │   │   │       ├── index.png
│   │   │   │   │       └── metadata.json
│   │   │   │   └── _root/                      # 根路径页面
│   │   │   │       ├── index.json
│   │   │   │       └── metadata.json
│   │   │   ├── sessions/
│   │   │   └── index/
│   └── example.com/
│       └── 2025/01/13/
│           └── pages/
│               └── _root/
│                   ├── index.json
│                   ├── index.png
│                   └── metadata.json
```

#### 2. 路径映射规则

```typescript
// URL到文件路径的映射规则
interface PathMappingRule {
  // 原始URL: https://en.wikipedia.org/wiki/Python_(programming_language)
  // 映射路径: domain/wikipedia.org/2025/01/13/pages/wiki/Python_(programming_language)/
  
  domain: string;           // wikipedia.org
  date: string;            // 2025/01/13
  urlPath: string;         // /wiki/Python_(programming_language)
  safePath: string;        // wiki/Python_(programming_language) (文件系统安全)
  fileName: string;        // index.json / index.png
}
```

#### 3. 文件系统安全处理

```typescript
// URL路径安全化处理
function sanitizePath(urlPath: string): string {
  return urlPath
    .replace(/^\//g, '')           // 移除开头的 /
    .replace(/\/$/, '')           // 移除结尾的 /
    .replace(/[<>:"|?*]/g, '_')   // 替换非法字符
    .replace(/\.{2,}/g, '_')      // 替换连续的点
    .replace(/\s+/g, '_')         // 替换空格
    .split('/')
    .map(segment => {
      // 处理每个路径段
      if (segment === '' || segment === '.' || segment === '..') {
        return '_';
      }
      // 限制长度
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

#### 4. 元数据结构增强

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

### 方案二：智能文件名 + 索引映射

#### 1. 文件命名策略

```
格式：{depth}-{readable_name}-{hash_suffix}.{ext}
示例：
- 0-python_programming_language-a1b2c3.json
- 1-machine_learning-e5f6g7.json
- 0-homepage-x9y8z7.png
```

#### 2. 可读名称生成

```typescript
function generateReadableName(url: string, title?: string): string {
  // 优先使用页面标题
  if (title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  }
  
  // 使用URL路径
  const urlObj = new URL(url);
  const pathSegments = urlObj.pathname.split('/').filter(Boolean);
  const lastSegment = pathSegments[pathSegments.length - 1] || 'homepage';
  
  return lastSegment
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 30);
}
```

### 方案三：混合方案（最佳实践）

结合方案一和方案二的优点：

#### 1. 目录结构：使用URL路径映射

#### 2. 文件命名：使用固定名称 + 元数据增强

#### 3. 快速查找：建立多重索引

```
目录结构：domain/{domain}/{date}/pages/{url_path}/
文件命名：index.json, index.png, metadata.json
索引文件：
- url_index.json     # URL到路径的映射
- title_index.json   # 标题到路径的映射
- hash_index.json    # 哈希到路径的映射（兼容性）
```

## 数据结构设计

### 1. URL索引结构

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
      "files": {
        "content": "index.json",
        "screenshot": "index.png",
        "metadata": "metadata.json"
      }
    }
  }
}
```

### 2. 反向索引结构

```json
{
  "path_to_url": {
    "domain/wikipedia.org/2025/01/13/pages/wiki/Python_(programming_language)/": "https://en.wikipedia.org/wiki/Python_(programming_language)"
  },
  "title_to_url": {
    "python programming language wikipedia": "https://en.wikipedia.org/wiki/Python_(programming_language)"
  }
}
```

## 前端展示优化

### 1. 文件列表展示

```html
<div class="file-item">
  <div class="file-icon">
    <img src="/api/files/icon?type=json" alt="JSON">
  </div>
  <div class="file-info">
    <div class="file-title">Python (programming language) - Wikipedia</div>
    <div class="file-url">https://en.wikipedia.org/wiki/Python_(programming_language)</div>
    <div class="file-meta">
      <span class="domain">wikipedia.org</span>
      <span class="date">2025-01-13</span>
      <span class="size">15.4 KB</span>
    </div>
  </div>
  <div class="file-actions">
    <button class="preview-btn">预览</button>
    <button class="download-btn">下载</button>
  </div>
</div>
```

### 2. 搜索功能增强

```typescript
interface SearchOptions {
  query?: string;        // 关键词搜索（标题、URL）
  domain?: string;       // 域名筛选
  dateRange?: {          // 日期范围
    start: string;
    end: string;
  };
  fileType?: string;     // 文件类型
  sessionId?: string;    // 会话ID
}
```

### 3. 批量操作支持

```typescript
interface BatchOperation {
  action: 'download' | 'delete' | 'export';
  files: string[];       // 文件路径列表
  options?: {
    format?: 'zip' | 'tar';
    includeMetadata?: boolean;
  };
}
```

## 实施计划

### 阶段1：存储结构重构

1. 实现URL路径映射逻辑
2. 修改文件存储服务
3. 创建迁移脚本

### 阶段2：索引系统

1. 建立URL索引
2. 实现反向索引
3. 添加搜索API

### 阶段3：前端优化

1. 更新文件列表展示
2. 增强搜索功能
3. 添加批量操作

### 阶段4：兼容性处理

1. 支持旧格式文件
2. 提供迁移工具
3. 渐进式升级

## 配置示例

```typescript
export const URLMappingConfig = {
  // 路径映射配置
  pathMapping: {
    enabled: true,
    maxPathLength: 200,
    maxSegmentLength: 100,
    reservedNames: ['_root', '_index', '_temp']
  },
  
  // 文件命名配置
  fileNaming: {
    content: 'index.json',
    screenshot: 'index.png',
    metadata: 'metadata.json'
  },
  
  // 索引配置
  indexing: {
    enabled: true,
    updateInterval: 300000, // 5分钟
    batchSize: 1000
  },
  
  // 搜索配置
  search: {
    enableFullText: true,
    enableFuzzy: true,
    maxResults: 100
  }
};
```

这个方案解决了文件可读性问题，同时保持了良好的性能和可维护性。通过URL路径映射，用户可以直观地从文件路径看出原始URL，而增强的索引系统则提供了强大的搜索和查找功能。
