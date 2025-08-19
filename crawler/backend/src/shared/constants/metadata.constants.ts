/**
 * MinIO metadata 字段常量定义
 * 注意：MinIO 在存储时使用 x-amz-meta- 前缀，但在读取时返回的是不带前缀的字段名
 */

// 存储时使用的字段名（带 x-amz-meta- 前缀）
export const METADATA_KEYS_STORAGE = {
  ORIGINAL_URL: 'x-amz-meta-original-url',
  // 来源于哪个 html 页面
  SOURCE_URL: 'x-amz-meta-source-url',
  TITLE: 'x-amz-meta-title',
  SESSION_ID: 'x-amz-meta-session-id',
  CRAWLED_AT: 'x-amz-meta-crawled-at',
  CAPTURED_AT: 'x-amz-meta-captured-at',
  DOWNLOADED_AT: 'x-amz-meta-downloaded-at',
  FILE_TYPE: 'x-amz-meta-file-type',
  MEDIA_TYPE: 'x-amz-meta-media-type',
  FILE_EXTENSION: 'x-amz-meta-file-extension',
  MD5_HASH: 'x-amz-meta-md5-hash',
  DOMAIN: 'x-amz-meta-domain',
  TOTAL_FILES: 'x-amz-meta-total-files',
  CREATED_AT: 'x-amz-meta-created-at'
} as const;

// 读取时使用的字段名（不带前缀）
export const METADATA_KEYS_RETRIEVAL = {
  ORIGINAL_URL: 'original-url',
  SOURCE_URL: 'source-url',
  TITLE: 'title',
  SESSION_ID: 'session-id',
  CRAWLED_AT: 'crawled-at',
  CAPTURED_AT: 'captured-at',
  DOWNLOADED_AT: 'downloaded-at',
  FILE_TYPE: 'file-type',
  MEDIA_TYPE: 'media-type',
  FILE_EXTENSION: 'file-extension',
  MD5_HASH: 'md5-hash',
  DOMAIN: 'domain',
  TOTAL_FILES: 'total-files',
  CREATED_AT: 'created-at'
} as const;

// 文件类型常量
export const FILE_TYPES = {
  CONTENT: 'content',
  METADATA: 'metadata',
  SCREENSHOT: 'screenshot',
  SESSION: 'session',
  URL_INDEX: 'url_index',
  MEDIA_METADATA: 'media-metadata'
} as const;