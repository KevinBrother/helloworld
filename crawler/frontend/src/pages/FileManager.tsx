import { useState, useEffect } from "react";
import { crawlerApi, mediaApi, fileApi } from "@/services/api";
import type {
  CrawSession,
  MediaFileInfo,
  MediaStats,
  SearchParams,
} from "@/types/api";
import { cn } from "@/lib/utils";

const FileManager = () => {
  const [sessions, setSessions] = useState<CrawSession[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFileInfo[]>([]);
  const [stats, setStats] = useState<MediaStats | null>(null);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    query: "",
    fileType: "",
    page: 1,
    limit: 20,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>("");

  // 获取统计信息
  const fetchStats = async () => {
    try {
      const response = await mediaApi.getStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("获取统计信息失败:", error);
    }
  };

  // 获取会话列表
  const fetchSessions = async () => {
    try {
      const response = await crawlerApi.getSessions();
      if (response.success && response.data) {
        setSessions(response.data);
      }
    } catch (error) {
      console.error("获取会话失败:", error);
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
      console.error("搜索失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 下载文件
  const handleDownloadFile = async (fileName: string) => {
    try {
      const blob = await fileApi.downloadFile(fileName);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("下载失败:", error);
      alert("下载失败");
    }
  };

  // 下载媒体文件
  const handleDownloadMedia = async (sessionId: string, fileName: string) => {
    try {
      const blob = await mediaApi.downloadMedia(sessionId, fileName);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("下载失败:", error);
      alert("下载失败");
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  useEffect(() => {
    fetchStats();
    fetchSessions();
    searchMediaFiles();
  }, []);

  useEffect(() => {
    searchMediaFiles();
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">文件管理</h1>
        <p className="mt-2 text-muted-foreground">管理和下载爬取的媒体文件</p>
      </div>

      {/* 统计信息 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              总文件数
            </h3>
            <p className="text-2xl font-bold text-foreground">
              {stats.totalFiles}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              总大小
            </h3>
            <p className="text-2xl font-bold text-foreground">
              {formatFileSize(stats.totalSize)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              图片文件
            </h3>
            <p className="text-2xl font-bold text-foreground">
              {Object.entries(stats.fileTypes)
                .filter(([type]) => type.startsWith("image/"))
                .reduce((sum, [, count]) => sum + count, 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              视频文件
            </h3>
            <p className="text-2xl font-bold text-foreground">
              {Object.entries(stats.fileTypes)
                .filter(([type]) => type.startsWith("video/"))
                .reduce((sum, [, count]) => sum + count, 0)}
            </p>
          </div>
        </div>
      )}

      {/* 搜索和过滤 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">搜索和过滤</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="搜索文件名..."
            value={searchParams.query || ""}
            onChange={(e) =>
              setSearchParams((prev) => ({
                ...prev,
                query: e.target.value,
                page: 1,
              }))
            }
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
          <select
            value={searchParams.fileType || ""}
            onChange={(e) =>
              setSearchParams((prev) => ({
                ...prev,
                fileType: e.target.value,
                page: 1,
              }))
            }
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">所有类型</option>
            <option value="image">图片</option>
            <option value="video">视频</option>
            <option value="audio">音频</option>
          </select>
          <select
            value={searchParams.sessionId || ""}
            onChange={(e) =>
              setSearchParams((prev) => ({
                ...prev,
                sessionId: e.target.value,
                page: 1,
              }))
            }
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">所有会话</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.startUrl.substring(0, 50)}...
              </option>
            ))}
          </select>
          <button
            onClick={searchMediaFiles}
            disabled={isLoading}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium text-primary-foreground transition-colors",
              isLoading
                ? "bg-muted cursor-not-allowed"
                : "bg-primary hover:bg-primary/90"
            )}
          >
            {isLoading ? "搜索中..." : "搜索"}
          </button>
        </div>
      </div>

      {/* 文件下载测试 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">文件下载测试</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="输入文件名..."
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
          <button
            onClick={() => handleDownloadFile(selectedFile)}
            disabled={!selectedFile.trim()}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium text-primary-foreground transition-colors",
              !selectedFile.trim()
                ? "bg-muted cursor-not-allowed"
                : "bg-primary hover:bg-primary/90"
            )}
          >
            下载文件
          </button>
        </div>
      </div>

      {/* 媒体文件列表 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">媒体文件列表</h2>
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">加载中...</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {mediaFiles.map((file) => (
              <div
                key={`${file.sessionId}-${file.fileName}`}
                className="p-4 rounded border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      原始URL: {file.originalUrl}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      大小: {formatFileSize(file.fileSize)} | 类型:{" "}
                      {file.mimeType} | 下载时间:{" "}
                      {new Date(file.downloadTime).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      会话ID: {file.sessionId}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleDownloadMedia(file.sessionId, file.fileName)
                      }
                      className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                      下载
                    </button>
                    {(file.mimeType.startsWith("image/") ||
                      file.mimeType.startsWith("video/")) && (
                      <button
                        onClick={() =>
                          window.open(
                            mediaApi.streamMedia(file.sessionId, file.fileName),
                            "_blank"
                          )
                        }
                        className="text-xs px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
                      >
                        预览
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {mediaFiles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                没有找到匹配的文件
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileManager;
