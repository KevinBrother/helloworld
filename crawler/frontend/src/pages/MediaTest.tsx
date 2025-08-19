import { useState, useEffect } from 'react';
import { mediaApi } from '@/services/api';
import type { MediaFileInfo, MediaStats, SearchParams } from '@/types/api';
import { cn } from '@/lib/utils';

const MediaTest = () => {
  const [mediaFiles, setMediaFiles] = useState<MediaFileInfo[]>([]);
  const [stats, setStats] = useState<MediaStats | null>(null);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    query: '',
    fileType: '',
    page: 1,
    limit: 10,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<MediaFileInfo | null>(null);

  // 获取统计信息
  const fetchStats = async () => {
    try {
      const response = await mediaApi.getStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  };

  // 搜索媒体文件
  const searchMediaFiles = async () => {
    setIsLoading(true);
    try {
      const response = await mediaApi.search(searchParams);
      if (response.success && response.data) {
        setMediaFiles(response.data.data);
      }
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 下载单个文件
  const handleDownloadFile = async (file: MediaFileInfo) => {
    try {
      const blob = await mediaApi.downloadMedia(file.sessionId, file.fileName);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败');
    }
  };

  // 批量下载选中文件
  const handleBatchDownload = async () => {
    if (selectedFiles.size === 0) {
      alert('请选择要下载的文件');
      return;
    }

    const filesToDownload = mediaFiles.filter(file => 
      selectedFiles.has(`${file.sessionId}-${file.fileName}`)
    );

    for (const file of filesToDownload) {
      await handleDownloadFile(file);
      await new Promise(resolve => setTimeout(resolve, 500)); // 延迟500ms避免并发过多
    }

    setSelectedFiles(new Set());
  };

  // 预览文件
  const handlePreviewFile = (file: MediaFileInfo) => {
    if (file.mimeType.startsWith('image/') || file.mimeType.startsWith('video/')) {
      setPreviewFile(file);
    } else {
      alert('该文件类型不支持预览');
    }
  };

  // 在新窗口中打开文件
  const handleOpenInNewWindow = (file: MediaFileInfo) => {
    const url = mediaApi.streamMedia(file.sessionId, file.fileName);
    window.open(url, '_blank');
  };

  // 切换文件选择
  const toggleFileSelection = (file: MediaFileInfo) => {
    const fileKey = `${file.sessionId}-${file.fileName}`;
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileKey)) {
      newSelected.delete(fileKey);
    } else {
      newSelected.add(fileKey);
    }
    setSelectedFiles(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedFiles.size === mediaFiles.length) {
      setSelectedFiles(new Set());
    } else {
      const allFileKeys = mediaFiles.map(file => `${file.sessionId}-${file.fileName}`);
      setSelectedFiles(new Set(allFileKeys));
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取文件类型图标
  const getFileTypeIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    return '📄';
  };

  useEffect(() => {
    fetchStats();
    searchMediaFiles();
  }, []);

  useEffect(() => {
    searchMediaFiles();
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">媒体文件测试</h1>
        <p className="mt-2 text-muted-foreground">
          测试媒体文件的搜索、预览和下载功能
        </p>
      </div>

      {/* 统计信息 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground">总文件数</h3>
            <p className="text-2xl font-bold text-foreground">{stats.totalFiles}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground">总大小</h3>
            <p className="text-2xl font-bold text-foreground">{formatFileSize(stats.totalSize)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground">图片文件</h3>
            <p className="text-2xl font-bold text-foreground">
              {Object.entries(stats.fileTypes)
                .filter(([type]) => type.startsWith('image/'))
                .reduce((sum, [, count]) => sum + count, 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground">视频文件</h3>
            <p className="text-2xl font-bold text-foreground">
              {Object.entries(stats.fileTypes)
                .filter(([type]) => type.startsWith('video/'))
                .reduce((sum, [, count]) => sum + count, 0)}
            </p>
          </div>
        </div>
      )}

      {/* 搜索和过滤 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">搜索和过滤</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="搜索文件名..."
            value={searchParams.query || ''}
            onChange={(e) => setSearchParams(prev => ({ ...prev, query: e.target.value, page: 1 }))}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
          <select
            value={searchParams.fileType || ''}
            onChange={(e) => setSearchParams(prev => ({ ...prev, fileType: e.target.value, page: 1 }))}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">所有类型</option>
            <option value="image">图片</option>
            <option value="video">视频</option>
            <option value="audio">音频</option>
          </select>
          <select
            value={searchParams.limit}
            onChange={(e) => setSearchParams(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value={10}>10条/页</option>
            <option value={20}>20条/页</option>
            <option value={50}>50条/页</option>
          </select>
          <button
            onClick={searchMediaFiles}
            disabled={isLoading}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium text-primary-foreground transition-colors',
              isLoading
                ? 'bg-muted cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90'
            )}
          >
            {isLoading ? '搜索中...' : '搜索'}
          </button>
          <button
            onClick={() => setSearchParams({ query: '', fileType: '', page: 1, limit: 10 })}
            className="rounded-md px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            重置
          </button>
        </div>
      </div>

      {/* 批量操作 */}
      {mediaFiles.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedFiles.size === mediaFiles.length && mediaFiles.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-border"
                />
                <span className="text-sm">全选 ({selectedFiles.size}/{mediaFiles.length})</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBatchDownload}
                disabled={selectedFiles.size === 0}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium text-primary-foreground transition-colors',
                  selectedFiles.size === 0
                    ? 'bg-muted cursor-not-allowed'
                    : 'bg-primary hover:bg-primary/90'
                )}
              >
                批量下载 ({selectedFiles.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 媒体文件列表 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">媒体文件列表</h2>
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">加载中...</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {mediaFiles.map((file) => {
              const fileKey = `${file.sessionId}-${file.fileName}`;
              const isSelected = selectedFiles.has(fileKey);
              
              return (
                <div
                  key={fileKey}
                  className={cn(
                    'p-4 rounded border transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFileSelection(file)}
                      className="mt-1 rounded border-border"
                    />
                    <div className="text-2xl">{getFileTypeIcon(file.mimeType)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.fileName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        原始URL: {file.originalUrl}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        大小: {formatFileSize(file.fileSize)} | 
                        类型: {file.mimeType} | 
                        下载时间: {new Date(file.downloadTime).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        会话ID: {file.sessionId}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleDownloadFile(file)}
                        className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                      >
                        下载
                      </button>
                      {(file.mimeType.startsWith('image/') || file.mimeType.startsWith('video/')) && (
                        <>
                          <button
                            onClick={() => handlePreviewFile(file)}
                            className="text-xs px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
                          >
                            预览
                          </button>
                          <button
                            onClick={() => handleOpenInNewWindow(file)}
                            className="text-xs px-3 py-1 bg-accent text-accent-foreground rounded hover:bg-accent/90"
                          >
                            新窗口
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {mediaFiles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                没有找到匹配的文件
              </p>
            )}
          </div>
        )}
      </div>

      {/* 分页 */}
      {mediaFiles.length > 0 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setSearchParams(prev => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
            disabled={(searchParams.page || 1) <= 1}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              (searchParams.page || 1) <= 1
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
            )}
          >
            上一页
          </button>
          <span className="flex items-center px-3 py-2 text-sm">
            第 {searchParams.page || 1} 页
          </span>
          <button
            onClick={() => setSearchParams(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
            disabled={mediaFiles.length < (searchParams.limit || 10)}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              mediaFiles.length < (searchParams.limit || 10)
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
            )}
          >
            下一页
          </button>
        </div>
      )}

      {/* 预览模态框 */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPreviewFile(null)}>
          <div className="bg-background rounded-lg p-4 max-w-4xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold truncate">{previewFile.fileName}</h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="text-center">
              {previewFile.mimeType.startsWith('image/') ? (
                <img
                  src={mediaApi.streamMedia(previewFile.sessionId, previewFile.fileName)}
                  alt={previewFile.fileName}
                  className="max-w-full max-h-[70vh] object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : previewFile.mimeType.startsWith('video/') ? (
                <video
                  src={mediaApi.streamMedia(previewFile.sessionId, previewFile.fileName)}
                  controls
                  className="max-w-full max-h-[70vh]"
                  onError={(e) => {
                    const target = e.target as HTMLVideoElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className="hidden text-muted-foreground">
                预览失败，请尝试下载文件
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaTest;