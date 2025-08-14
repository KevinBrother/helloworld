# 媒体文件爬取策略设计文档

## 概述

本文档描述了对现有爬虫系统的增强，增加对图片、视频、PDF等媒体文件的爬取和存储功能。用户可以选择性地启用媒体文件爬取，系统将自动下载、存储并管理这些资源。

## 功能需求

### 1. 媒体类型支持
- **图片**: JPG, PNG, GIF, WebP, SVG, BMP, ICO
- **视频**: MP4, AVI, MOV, WMV, FLV, WebM, MKV
- **音频**: MP3, WAV, AAC, OGG, M4A
- **文档**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- **压缩包**: ZIP, RAR, 7Z, TAR, GZ

### 2. 配置选项
```typescript
interface MediaCrawlOptions {
  enableMediaCrawl: boolean;           // 是否启用媒体爬取
  mediaTypes: MediaTypeConfig[];       // 要爬取的媒体类型配置
  maxFileSize: number;                 // 单个文件最大大小 (MB)
  maxTotalSize: number;                // 单次爬取总大小限制 (MB)
  downloadTimeout: number;             // 下载超时时间 (秒)
  concurrent: number;                  // 并发下载数量
  skipDuplicates: boolean;             // 是否跳过重复文件
}

interface MediaTypeConfig {
  type: MediaType;                     // 媒体类型
  mode: 'inherit' | 'override';        // 继承或覆盖模式
  extensions?: string[];               // 扩展名列表
}

enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video', 
  AUDIO = 'audio',
  DOCUMENT = 'document',
  ARCHIVE = 'archive'
}

// 预设扩展名配置
const DEFAULT_EXTENSIONS: Record<MediaType, string[]> = {
  [MediaType.IMAGE]: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
  [MediaType.VIDEO]: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
  [MediaType.AUDIO]: ['mp3', 'wav', 'aac', 'ogg', 'm4a'],
  [MediaType.DOCUMENT]: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
  [MediaType.ARCHIVE]: ['zip', 'rar', '7z', 'tar', 'gz']
};
```

### 3. 配置示例

#### 使用预设配置
```typescript
const options: MediaCrawlOptions = {
  enableMediaCrawl: true,
  mediaTypes: [
    { type: MediaType.IMAGE, mode: 'inherit' },        // 爬取所有预设图片格式
    { type: MediaType.DOCUMENT, mode: 'inherit' }      // 爬取所有预设文档格式
  ],
  maxFileSize: 50,
  maxTotalSize: 500,
  downloadTimeout: 30,
  concurrent: 3,
  skipDuplicates: true
};
```

#### 使用覆盖配置
```typescript
const options: MediaCrawlOptions = {
  enableMediaCrawl: true,
  mediaTypes: [
    { 
      type: MediaType.IMAGE, 
      mode: 'override', 
      extensions: ['jpg', 'png']           // 只爬取JPG和PNG
    },
    { 
      type: MediaType.VIDEO, 
      mode: 'override', 
      extensions: ['mp4']                  // 只爬取MP4视频
    }
  ],
  maxFileSize: 100,
  maxTotalSize: 1000,
  downloadTimeout: 60,
  concurrent: 5,
  skipDuplicates: true
};
```

#### 继承扩展配置
```typescript
const options: MediaCrawlOptions = {
  enableMediaCrawl: true,
  mediaTypes: [
    { 
      type: MediaType.IMAGE, 
      mode: 'inherit', 
      extensions: ['tiff', 'raw']          // 在预设基础上增加TIFF和RAW格式
    },
    { 
      type: MediaType.DOCUMENT, 
      mode: 'override', 
      extensions: ['pdf']                  // 只爬取PDF文档
    }
  ],
  maxFileSize: 50,
  maxTotalSize: 500,
  downloadTimeout: 30,
  concurrent: 3,
  skipDuplicates: true
};
```

#### 配置模式说明

**继承模式（在预设基础上增加）：**
```typescript
{
  type: MediaType.IMAGE,
  mode: 'inherit',
  extensions: ['tiff', 'raw']
}
// 最终支持：['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'raw']
```

**覆盖模式（只使用指定扩展名）：**
```typescript
{
  type: MediaType.IMAGE,
  mode: 'override',
  extensions: ['jpg', 'png']
}
// 只爬取 JPG 和 PNG 格式的图片
```

**使用预设（不指定extensions）：**
```typescript
{
  type: MediaType.IMAGE,
  mode: 'inherit'
}
// 使用预设的图片扩展名：['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']
```

**混合配置：**
```typescript
{
  mediaTypes: [
    { type: MediaType.IMAGE, mode: 'inherit', extensions: ['tiff'] },
    { type: MediaType.VIDEO, mode: 'override', extensions: ['mp4'] },
    { type: MediaType.DOCUMENT, mode: 'inherit' }
  ]
}
```

## 技术架构

### 1. 核心组件

#### MediaDetectorService
- 负责从页面中检测媒体资源
- 支持多种检测方式：
  - DOM元素扫描 (`<img>`, `<video>`, `<audio>`, `<a href="*.pdf">`)
  - CSS背景图片检测
  - JavaScript动态加载资源检测
  - 链接文件扩展名分析

#### MediaDownloaderService  
- 负责媒体文件的下载和验证
- 功能特性：
  - 并发下载控制
  - 文件大小验证
  - 重试机制
  - 进度跟踪
  - 文件完整性校验

#### MediaStorageService
- 负责媒体文件的存储和管理
- 存储策略：
  - 按域名和日期分类存储
  - 文件去重（基于MD5哈希）
  - 元数据记录
  - 缩略图生成（图片）

### 2. 存储结构

```
minio://crawler-pages/
├── domain/
│   └── example.com/
│       └── 2025/08/14/
│           ├── pages/           # 页面数据
│           │   └── session-id/
│           └── media/           # 媒体文件
│               ├── images/
│               │   ├── original/
│               │   └── thumbnails/
│               ├── videos/
│               ├── documents/
│               └── metadata.json
└── sessions/
    └── session-id/
        ├── metadata.json        # 包含媒体统计信息
        └── media-index.json     # 媒体文件索引
```

### 3. 数据模型

#### MediaFile
```typescript
interface MediaFile {
  id: string;                    // 唯一标识
  originalUrl: string;           // 原始URL
  fileName: string;              // 存储文件名
  fileType: MediaType;           // 文件类型
  mimeType: string;              // MIME类型
  fileSize: number;              // 文件大小（字节）
  md5Hash: string;               // MD5哈希值
  downloadTime: Date;            // 下载时间
  sourcePageUrl: string;         // 来源页面URL
  storagePath: string;           // 存储路径
  thumbnailPath?: string;        // 缩略图路径（图片）
  metadata?: Record<string, any>; // 额外元数据
}
```

#### MediaCrawlSession
```typescript
interface MediaCrawlSession {
  sessionId: string;
  mediaOptions: MediaCrawlOptions;
  statistics: {
    totalFiles: number;
    totalSize: number;
    filesByType: Record<MediaType, number>;
    downloadErrors: number;
    skippedFiles: number;
  };
  mediaFiles: MediaFile[];
}
```

## 实现方案

### 1. 页面媒体检测

```typescript
// 在BrowserService中增加媒体检测
async detectMediaResources(page: Page): Promise<MediaResource[]> {
  return await page.evaluate(() => {
    const resources: MediaResource[] = [];
    
    // 检测图片
    document.querySelectorAll('img').forEach(img => {
      if (img.src) resources.push({
        url: img.src,
        type: MediaType.IMAGE,
        element: 'img'
      });
    });
    
    // 检测视频
    document.querySelectorAll('video').forEach(video => {
      if (video.src) resources.push({
        url: video.src,
        type: MediaType.VIDEO,
        element: 'video'
      });
    });
    
    // 检测链接中的文件
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      const mediaType = detectMediaTypeFromUrl(href);
      if (mediaType) {
        resources.push({
          url: href,
          type: mediaType,
          element: 'link'
        });
      }
    });
    
    return resources;
  });
}
```

### 2. 下载管理

```typescript
@Injectable()
export class MediaDownloaderService {
  private downloadQueue = new PQueue({ concurrency: 3 });
  
  async downloadMedia(
    resources: MediaResource[], 
    options: MediaCrawlOptions,
    sessionId: string
  ): Promise<MediaFile[]> {
    const downloadedFiles: MediaFile[] = [];
    
    for (const resource of resources) {
      if (!this.shouldDownload(resource, options)) continue;
      
      try {
        const mediaFile = await this.downloadQueue.add(() => 
          this.downloadSingleFile(resource, sessionId)
        );
        downloadedFiles.push(mediaFile);
      } catch (error) {
        this.logger.warn(`下载失败: ${resource.url}`, error);
      }
    }
    
    return downloadedFiles;
  }
  
  private async downloadSingleFile(
    resource: MediaResource, 
    sessionId: string
  ): Promise<MediaFile> {
    // 实现单个文件下载逻辑
    // 包括：URL解析、文件下载、大小验证、哈希计算、存储
  }
}
```

### 3. API接口扩展

#### 爬取接口更新
```typescript
// POST /api/crawler/crawl
interface CrawlRequest {
  startUrl: string;
  maxDepth?: number;
  maxPages?: number;
  takeScreenshots?: boolean;
  
  // 新增媒体爬取选项
  mediaOptions?: {
    enableMediaCrawl: boolean;
    mediaTypes: MediaTypeConfig[];  // 使用新的配置结构
    maxFileSize: number;            // MB
    maxTotalSize: number;           // MB
    downloadTimeout: number;        // 秒
    concurrent: number;
    skipDuplicates: boolean;
  };
}

// 请求示例
const crawlRequest: CrawlRequest = {
  startUrl: "https://example.com",
  maxDepth: 2,
  maxPages: 10,
  takeScreenshots: true,
  mediaOptions: {
    enableMediaCrawl: true,
    mediaTypes: [
      { type: "image", mode: "inherit" },
      { type: "document", mode: "override", extensions: ["pdf"] }
    ],
    maxFileSize: 50,
    maxTotalSize: 500,
    downloadTimeout: 30,
    concurrent: 3,
    skipDuplicates: true
  }
};
```

#### 新增媒体查询接口
```typescript
// GET /api/crawler/sessions/:sessionId/media
// 获取会话的媒体文件列表

// GET /api/crawler/media/:fileId/download
// 获取媒体文件下载链接

// GET /api/crawler/media/statistics
// 获取媒体爬取统计信息
```

## 性能优化

### 1. 下载优化
- 并发控制：限制同时下载数量
- 断点续传：支持大文件断点续传
- 缓存策略：相同文件只下载一次
- 压缩传输：支持gzip压缩

### 2. 存储优化
- 文件去重：基于MD5哈希去重
- 分层存储：热数据和冷数据分离
- 缩略图：图片自动生成缩略图
- 清理策略：定期清理过期文件

### 3. 内存优化
- 流式下载：大文件使用流式处理
- 队列管理：控制内存中的任务数量
- 垃圾回收：及时释放不用的资源

## 安全考虑

### 1. 文件安全
- 文件类型验证：检查文件头部魔数
- 大小限制：防止下载过大文件
- 病毒扫描：集成病毒扫描（可选）
- 访问控制：限制文件访问权限

### 2. 网络安全
- URL白名单：限制下载域名
- 请求限制：防止SSRF攻击
- 超时控制：避免长时间占用连接
- 重试限制：防止无限重试

## 监控和日志

### 1. 监控指标
- 下载成功率
- 平均下载速度
- 存储空间使用
- 错误率统计

### 2. 日志记录
- 下载开始/完成日志
- 错误详情记录
- 性能指标记录
- 用户操作审计

## 部署考虑

### 1. 资源需求
- 存储空间：根据媒体文件大小规划
- 网络带宽：考虑下载带宽需求
- CPU/内存：文件处理和并发需求

### 2. 配置管理
- 环境变量配置
- 动态配置更新
- 配置验证机制

## 测试策略

### 1. 单元测试
- 媒体检测逻辑测试
- 下载功能测试
- 存储逻辑测试

### 2. 集成测试
- 端到端爬取测试
- 大文件下载测试
- 并发下载测试

### 3. 性能测试
- 下载速度测试
- 内存使用测试
- 存储性能测试

## 实施计划

### 阶段1：基础架构（1-2天）
- 创建MediaDetectorService
- 创建MediaDownloaderService  
- 创建MediaStorageService
- 更新数据模型

### 阶段2：核心功能（2-3天）
- 实现媒体检测逻辑
- 实现下载管理
- 实现存储管理
- 集成到现有爬取流程

### 阶段3：API和UI（1-2天）
- 扩展API接口
- 更新测试页面
- 添加媒体文件管理界面

### 阶段4：优化和测试（1-2天）
- 性能优化
- 安全加固
- 全面测试
- 文档完善

## 风险评估

### 技术风险
- 大文件下载可能导致内存溢出
- 并发下载可能影响系统性能
- 存储空间可能快速增长

### 缓解措施
- 实施严格的大小限制
- 使用流式处理
- 实施存储清理策略
- 添加监控和告警

## 前端界面设计 (api-test.html)

### 1. 媒体爬取配置区域

在现有的爬取配置表单中，新增媒体爬取配置区域：

```html
<!-- 媒体爬取配置区域 -->
<div class="form-section">
  <h3>媒体文件爬取配置</h3>
  
  <!-- 启用媒体爬取开关 -->
  <div class="form-group">
    <label>
      <input type="checkbox" id="enableMediaCrawl"> 启用媒体文件爬取
    </label>
  </div>
  
  <!-- 媒体类型配置 -->
  <div id="mediaTypesConfig" class="media-config" style="display: none;">
    
    <!-- 图片配置 -->
    <div class="media-type-group">
      <label>
        <input type="checkbox" class="media-type-checkbox" data-type="image"> 图片文件
      </label>
      <div class="media-extensions" data-type="image" style="display: none;">
        <label>
          <input type="radio" name="image-mode" value="inherit" checked> 继承预设格式 (JPG, PNG, GIF, WebP, SVG, BMP, ICO)
        </label>
        <label>
          <input type="radio" name="image-mode" value="override"> 覆盖为自定义格式
        </label>
        <div class="extensions-config">
          <input type="text" placeholder="继承模式：在预设基础上增加格式，如: tiff,raw" class="extensions-input" data-type="image">
          <small class="mode-hint">继承模式：在预设格式基础上增加新格式 | 覆盖模式：只使用指定格式</small>
        </div>
      </div>
    </div>
    
    <!-- 视频配置 -->
    <div class="media-type-group">
      <label>
        <input type="checkbox" class="media-type-checkbox" data-type="video"> 视频文件
      </label>
      <div class="media-extensions" data-type="video" style="display: none;">
        <label>
          <input type="radio" name="video-mode" value="inherit" checked> 继承预设格式 (MP4, AVI, MOV, WMV, FLV, WebM, MKV)
        </label>
        <label>
          <input type="radio" name="video-mode" value="override"> 覆盖为自定义格式
        </label>
        <div class="extensions-config">
          <input type="text" placeholder="输入文件扩展名，用逗号分隔" class="extensions-input" data-type="video">
          <small class="mode-hint">继承模式：在预设格式基础上增加新格式 | 覆盖模式：只使用指定格式</small>
        </div>
      </div>
    </div>
    
    <!-- 音频配置 -->
     <div class="media-type-group">
       <label>
         <input type="checkbox" class="media-type-checkbox" data-type="audio"> 音频文件
       </label>
       <div class="media-extensions" data-type="audio" style="display: none;">
         <label>
           <input type="radio" name="audio-mode" value="inherit" checked> 继承预设格式 (MP3, WAV, AAC, OGG, M4A)
         </label>
         <label>
           <input type="radio" name="audio-mode" value="override"> 覆盖为自定义格式
         </label>
         <div class="extensions-config">
           <input type="text" placeholder="继承模式：在预设基础上增加格式，如: flac,ape" class="extensions-input" data-type="audio">
           <small class="mode-hint">继承模式：在预设格式基础上增加新格式 | 覆盖模式：只使用指定格式</small>
         </div>
       </div>
     </div>
     
     <!-- 文档配置 -->
     <div class="media-type-group">
       <label>
         <input type="checkbox" class="media-type-checkbox" data-type="document"> 文档文件
       </label>
       <div class="media-extensions" data-type="document" style="display: none;">
         <label>
           <input type="radio" name="document-mode" value="inherit" checked> 继承预设格式 (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX)
         </label>
         <label>
           <input type="radio" name="document-mode" value="override"> 覆盖为自定义格式
         </label>
         <div class="extensions-config">
           <input type="text" placeholder="继承模式：在预设基础上增加格式，如: txt,rtf" class="extensions-input" data-type="document">
           <small class="mode-hint">继承模式：在预设格式基础上增加新格式 | 覆盖模式：只使用指定格式</small>
         </div>
       </div>
     </div>
     
     <!-- 压缩包配置 -->
     <div class="media-type-group">
       <label>
         <input type="checkbox" class="media-type-checkbox" data-type="archive"> 压缩包文件
       </label>
       <div class="media-extensions" data-type="archive" style="display: none;">
         <label>
           <input type="radio" name="archive-mode" value="inherit" checked> 继承预设格式 (ZIP, RAR, 7Z, TAR, GZ)
         </label>
         <label>
           <input type="radio" name="archive-mode" value="override"> 覆盖为自定义格式
         </label>
         <div class="extensions-config">
           <input type="text" placeholder="继承模式：在预设基础上增加格式，如: bz2,xz" class="extensions-input" data-type="archive">
           <small class="mode-hint">继承模式：在预设格式基础上增加新格式 | 覆盖模式：只使用指定格式</small>
         </div>
       </div>
     </div>
    
    <!-- 下载配置 -->
    <div class="download-config">
      <h4>下载配置</h4>
      <div class="form-row">
        <div class="form-group">
          <label for="maxFileSize">单个文件最大大小 (MB):</label>
          <input type="number" id="maxFileSize" value="50" min="1" max="1000">
        </div>
        <div class="form-group">
          <label for="maxTotalSize">总下载大小限制 (MB):</label>
          <input type="number" id="maxTotalSize" value="500" min="1" max="10000">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="downloadTimeout">下载超时时间 (秒):</label>
          <input type="number" id="downloadTimeout" value="30" min="5" max="300">
        </div>
        <div class="form-group">
          <label for="concurrent">并发下载数量:</label>
          <input type="number" id="concurrent" value="3" min="1" max="10">
        </div>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="skipDuplicates" checked> 跳过重复文件
        </label>
      </div>
    </div>
  </div>
</div>
```

### 2. JavaScript 交互逻辑

```javascript
// 媒体爬取配置相关的JavaScript代码

// 启用/禁用媒体爬取
document.getElementById('enableMediaCrawl').addEventListener('change', function(e) {
  const mediaConfig = document.getElementById('mediaTypesConfig');
  mediaConfig.style.display = e.target.checked ? 'block' : 'none';
});

// 媒体类型选择
document.querySelectorAll('.media-type-checkbox').forEach(checkbox => {
  checkbox.addEventListener('change', function(e) {
    const type = e.target.dataset.type;
    const extensionsDiv = document.querySelector(`.media-extensions[data-type="${type}"]`);
    extensionsDiv.style.display = e.target.checked ? 'block' : 'none';
  });
});

// 继承/覆盖模式切换
document.querySelectorAll('input[type="radio"]').forEach(radio => {
  radio.addEventListener('change', function(e) {
    const extensionsDiv = e.target.parentElement.parentElement.querySelector('.extensions-config');
    const input = extensionsDiv.querySelector('.extensions-input');
    const hint = extensionsDiv.querySelector('.mode-hint');
    
    if (e.target.value === 'inherit') {
      input.placeholder = input.placeholder.replace('覆盖模式：只使用指定格式', '继承模式：在预设基础上增加格式');
    } else {
      input.placeholder = input.placeholder.replace('继承模式：在预设基础上增加格式', '覆盖模式：只使用指定格式');
    }
  });
});

// 构建媒体配置对象
function buildMediaOptions() {
  const enableMediaCrawl = document.getElementById('enableMediaCrawl').checked;
  
  if (!enableMediaCrawl) {
    return { enableMediaCrawl: false };
  }
  
  const mediaTypes = [];
  
  document.querySelectorAll('.media-type-checkbox:checked').forEach(checkbox => {
    const type = checkbox.dataset.type;
    const modeRadio = document.querySelector(`input[name="${type}-mode"]:checked`);
    
    const extensionsInput = document.querySelector(`.extensions-input[data-type="${type}"]`);
    const extensions = extensionsInput.value.split(',').map(ext => ext.trim()).filter(ext => ext);
    
    const config = {
      type: type,
      mode: modeRadio.value
    };
    
    if (extensions.length > 0) {
      config.extensions = extensions;
    }
    
    mediaTypes.push(config);
  });
  
  return {
    enableMediaCrawl: true,
    mediaTypes: mediaTypes,
    maxFileSize: parseInt(document.getElementById('maxFileSize').value),
    maxTotalSize: parseInt(document.getElementById('maxTotalSize').value),
    downloadTimeout: parseInt(document.getElementById('downloadTimeout').value),
    concurrent: parseInt(document.getElementById('concurrent').value),
    skipDuplicates: document.getElementById('skipDuplicates').checked
  };
}

// 修改现有的爬取函数，添加媒体配置
function startCrawl() {
  const crawlData = {
    startUrl: document.getElementById('startUrl').value,
    maxDepth: parseInt(document.getElementById('maxDepth').value),
    maxPages: parseInt(document.getElementById('maxPages').value),
    takeScreenshots: document.getElementById('takeScreenshots').checked,
    mediaOptions: buildMediaOptions()  // 添加媒体配置
  };
  
  // 发送爬取请求...
}
```

### 3. CSS 样式

```css
/* 媒体配置相关样式 */
.media-config {
  border: 1px solid #ddd;
  padding: 15px;
  margin-top: 10px;
  border-radius: 5px;
  background-color: #f9f9f9;
}

.media-type-group {
  margin-bottom: 15px;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 3px;
  background-color: white;
}

.media-extensions {
  margin-left: 20px;
  margin-top: 10px;
}

.extensions-config {
   margin-left: 20px;
   margin-top: 10px;
   padding: 10px;
   background-color: #fafafa;
   border-radius: 3px;
   border: 1px solid #e0e0e0;
 }
 
 .extensions-input {
   width: 100%;
   padding: 8px;
   margin-bottom: 5px;
   border: 1px solid #ccc;
   border-radius: 3px;
   font-size: 14px;
 }
 
 .mode-hint {
   display: block;
   color: #666;
   font-size: 12px;
   margin-top: 5px;
   line-height: 1.4;
 }

.download-config {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background-color: #f5f5f5;
}

.form-row {
  display: flex;
  gap: 15px;
  margin-bottom: 10px;
}

.form-row .form-group {
  flex: 1;
}
```

### 4. 媒体文件查询界面

在现有的查询结果区域，新增媒体文件展示：

```html
<!-- 媒体文件查询结果 -->
<div id="mediaResults" class="results-section" style="display: none;">
  <h3>媒体文件</h3>
  <div class="media-stats">
    <span id="mediaCount">0</span> 个媒体文件，
    总大小: <span id="mediaTotalSize">0 MB</span>
  </div>
  <div class="media-filters">
    <select id="mediaTypeFilter">
      <option value="all">所有类型</option>
      <option value="image">图片</option>
      <option value="video">视频</option>
      <option value="audio">音频</option>
      <option value="document">文档</option>
      <option value="archive">压缩包</option>
    </select>
  </div>
  <div id="mediaFilesList" class="media-files-list"></div>
</div>
```

### 5. 媒体文件展示组件

```javascript
// 展示媒体文件列表
function displayMediaFiles(mediaFiles) {
  const container = document.getElementById('mediaFilesList');
  container.innerHTML = '';
  
  mediaFiles.forEach(file => {
    const fileElement = document.createElement('div');
    fileElement.className = 'media-file-item';
    fileElement.innerHTML = `
      <div class="file-info">
        <div class="file-name">${file.fileName}</div>
        <div class="file-details">
          <span class="file-type">${file.fileType}</span>
          <span class="file-size">${formatFileSize(file.fileSize)}</span>
          <span class="file-source">来源: ${file.sourcePageUrl}</span>
        </div>
      </div>
      <div class="file-actions">
        <button onclick="downloadMediaFile('${file.id}')">下载</button>
        ${file.thumbnailPath ? `<button onclick="viewThumbnail('${file.id}')">预览</button>` : ''}
      </div>
    `;
    container.appendChild(fileElement);
  });
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
```

---

请确认以上设计方案是否符合您的需求，我将根据您的反馈进行调整并开始实施。