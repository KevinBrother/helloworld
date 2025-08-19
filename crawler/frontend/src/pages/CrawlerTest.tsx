import { useState, useEffect } from "react";
import { crawlerApi, mediaApi } from "@/services/api";
import type {
  CrawlResponse,
  CrawSession,
  MediaFileInfo,
  CrawlConfig,
} from "@/types/api";
import { cn } from "@/lib/utils";

const CrawlerTest = () => {
  const [url, setUrl] = useState("https://rpa-docs.datagrand.com/");
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<CrawSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionMedia, setSessionMedia] = useState<MediaFileInfo[]>([]);
  const [crawlResult, setCrawlResult] = useState<CrawlResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // 爬取配置状态
  const [crawlMode, setCrawlMode] = useState<"complete" | "limited">(
    "complete"
  );
  const [maxPages, setMaxPages] = useState(50);
  const [maxDepth, setMaxDepth] = useState(6);
  const [enableMediaCrawl, setEnableMediaCrawl] = useState(true);
  const [mediaConfigMode, setMediaConfigMode] = useState<"all" | "custom">(
    "all"
  );
  const [downloadMode, setDownloadMode] = useState<"unlimited" | "limited">(
    "unlimited"
  );

  // 高级配置选项
  const [waitFor, setWaitFor] = useState(3000);
  const [screenshot, setScreenshot] = useState(true);
  const [fullPage, setFullPage] = useState(true);
  const [userAgent, setUserAgent] = useState("");
  const [headers, setHeaders] = useState("");
  const [cookies, setCookies] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 媒体类型配置
  const [mediaTypes, setMediaTypes] = useState({
    image: {
      enabled: true,
      mode: "inherit" as "inherit" | "override",
      extensions: "",
    },
    video: {
      enabled: true,
      mode: "inherit" as "inherit" | "override",
      extensions: "",
    },
    audio: {
      enabled: true,
      mode: "inherit" as "inherit" | "override",
      extensions: "",
    },
    document: {
      enabled: true,
      mode: "inherit" as "inherit" | "override",
      extensions: "",
    },
    archive: {
      enabled: true,
      mode: "inherit" as "inherit" | "override",
      extensions: "",
    },
  });

  // 下载限制配置
  const [downloadLimits, setDownloadLimits] = useState({
    maxFileSize: 10000,
    maxTotalSize: 100000,
    downloadTimeout: 300,
    maxConcurrent: 10,
    skipDuplicates: true,
  });

  // 清除消息
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // 显示错误消息
  const showError = (message: string) => {
    setError(message);
    setSuccess(null);
    setTimeout(() => setError(null), 5000);
  };

  // 显示成功消息
  const showSuccess = (message: string) => {
    setSuccess(message);
    setError(null);
    setTimeout(() => setSuccess(null), 5000);
  };

  // 获取所有会话
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

  // 获取会话媒体文件
  const fetchSessionMedia = async (sessionId: string) => {
    try {
      const response = await crawlerApi.getSessionMedia(sessionId);
      if (response.success && response.data) {
        setSessionMedia(response.data);
      }
    } catch (error) {
      console.error("获取会话媒体失败:", error);
    }
  };

  // 构建爬取配置
  const buildCrawlConfig = () => {
    const config: CrawlConfig = {
      url: url.trim(),
      options: {
        waitFor,
        screenshot,
        fullPage,
        maxDepth,
        enableMediaCrawl,
      },
    };

    if (crawlMode === "limited") {
      config.options.maxPages = maxPages;
    }

    // 添加高级配置
    if (userAgent.trim()) {
      config.options.userAgent = userAgent.trim();
    }

    if (headers.trim()) {
      try {
        config.options.headers = JSON.parse(headers);
      } catch (e) {
        console.warn("Invalid headers JSON, ignoring");
      }
    }

    if (cookies.trim()) {
      try {
        config.options.cookies = JSON.parse(cookies);
      } catch (e) {
        console.warn("Invalid cookies JSON, ignoring");
      }
    }

    if (enableMediaCrawl && mediaConfigMode === "custom") {
      const mediaConfig: any = {};
      Object.entries(mediaTypes).forEach(([type, typeConfig]) => {
        if (typeConfig.enabled) {
          mediaConfig[type] = {
            mode: typeConfig.mode,
            extensions: typeConfig.extensions
              ? typeConfig.extensions.split(",").map((ext) => ext.trim())
              : [],
          };
        }
      });
      config.options.mediaTypes = mediaConfig;
    }

    if (downloadMode === "limited") {
      config.options.downloadLimits = downloadLimits;
    }

    return config;
  };

  // 开始爬取
  const handleCrawl = async () => {
    if (!url.trim()) {
      showError("请输入URL");
      return;
    }

    if (enableMediaCrawl && mediaConfigMode === "custom") {
      const hasEnabledTypes = Object.values(mediaTypes).some(
        (type) => type.enabled
      );
      if (!hasEnabledTypes) {
        showError("启用媒体爬取时请至少选择一种媒体类型");
        return;
      }
    }

    clearMessages();
    setIsLoading(true);
    try {
      const crawlConfig = buildCrawlConfig();
      const response = await crawlerApi.crawl(crawlConfig);

      if (response.success && response.data) {
        setCrawlResult(response.data);
        setCurrentSessionId(response.data.sessionId);
        showSuccess(`爬取任务已启动，会话ID: ${response.data.sessionId}`);
        await fetchSessions(); // 刷新会话列表
      }
    } catch (error: any) {
      console.error("爬取失败:", error);
      showError(error.message || "爬取失败，请检查URL或网络连接");
    } finally {
      setIsLoading(false);
    }
  };

  // 停止爬取
  const handleStopCrawl = async (sessionId: string) => {
    try {
      await crawlerApi.stopCrawl(sessionId);
      if (sessionId === currentSessionId) {
        setCurrentSessionId(null);
      }
      showSuccess("爬取任务已停止");
      await fetchSessions(); // 刷新会话列表
    } catch (error: any) {
      console.error("停止爬取失败:", error);
      showError(error.message || "停止爬取失败");
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

  // 选择会话
  const handleSelectSession = (sessionId: string) => {
    setSelectedSession(sessionId);
    fetchSessionMedia(sessionId);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          🕷️ 网页爬取功能测试
        </h1>
        <p className="mt-2 text-muted-foreground">
          测试网站爬虫的页面爬取和媒体文件检测下载功能
        </p>
      </div>

      {/* 消息提示 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex">
            <div className="text-sm text-red-700">{error}</div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex">
            <div className="text-sm text-green-700">{success}</div>
            <button
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-400 hover:text-green-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 爬取表单 */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">🚀 启动媒体爬取任务</h2>

        {/* URL输入 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            目标网站URL:
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 爬取模式 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            爬取模式:
          </label>
          <select
            value={crawlMode}
            onChange={(e) =>
              setCrawlMode(e.target.value as "complete" | "limited")
            }
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="complete">完全爬取</option>
            <option value="limited">限制页面数</option>
          </select>
        </div>

        {/* 最大页面数 */}
        {crawlMode === "limited" && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              最大页面数:
            </label>
            <input
              type="number"
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              min="1"
              max="1000"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* 爬取深度 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            爬取深度:
          </label>
          <input
            type="number"
            value={maxDepth}
            onChange={(e) => setMaxDepth(Number(e.target.value))}
            min="1"
            max="10"
            title="爬取深度决定了从起始页面开始，最多跟踪多少层链接"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <small className="text-xs text-gray-500 mt-1 block">
            深度1=仅起始页面，深度2=起始页面+直接链接页面，以此类推
          </small>
        </div>

        {/* 高级配置切换 */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showAdvanced ? "隐藏高级配置" : "显示高级配置"}
          </button>
        </div>

        {/* 高级配置 */}
        {showAdvanced && (
          <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700 mb-3">高级配置</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  等待时间 (毫秒):
                </label>
                <input
                  type="number"
                  value={waitFor}
                  onChange={(e) => setWaitFor(Number(e.target.value))}
                  min="0"
                  max="30000"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={screenshot}
                    onChange={(e) => setScreenshot(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-xs text-gray-700">截图</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={fullPage}
                    onChange={(e) => setFullPage(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-xs text-gray-700">全页面</span>
                </label>
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                User Agent:
              </label>
              <input
                type="text"
                value={userAgent}
                onChange={(e) => setUserAgent(e.target.value)}
                placeholder="自定义User Agent（可选）"
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                请求头 (JSON格式):
              </label>
              <textarea
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                placeholder='{"Authorization": "Bearer token"}'
                rows={2}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Cookies (JSON格式):
              </label>
              <textarea
                value={cookies}
                onChange={(e) => setCookies(e.target.value)}
                placeholder='[{"name": "session", "value": "abc123", "domain": ".example.com"}]'
                rows={2}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* 启用媒体文件爬取 */}
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={enableMediaCrawl}
              onChange={(e) => setEnableMediaCrawl(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">
              启用媒体文件爬取
            </span>
          </label>
        </div>

        {/* 媒体爬取模式 */}
        {enableMediaCrawl && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              媒体爬取模式:
            </label>
            <select
              value={mediaConfigMode}
              onChange={(e) =>
                setMediaConfigMode(e.target.value as "all" | "custom")
              }
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">爬取所有媒体文件</option>
              <option value="custom">自定义选择媒体类型</option>
            </select>
          </div>
        )}

        {/* 媒体类型配置 */}
        {enableMediaCrawl && mediaConfigMode === "custom" && (
          <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              媒体类型配置
            </h3>
            {Object.entries(mediaTypes).map(([type, config]) => (
              <div
                key={type}
                className="mb-4 p-3 border border-gray-200 rounded bg-white"
              >
                <label className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) =>
                      setMediaTypes((prev) => ({
                        ...prev,
                        [type]: {
                          ...prev[type as keyof typeof prev],
                          enabled: e.target.checked,
                        },
                      }))
                    }
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {type === "image"
                      ? "图片"
                      : type === "video"
                      ? "视频"
                      : type === "audio"
                      ? "音频"
                      : type === "document"
                      ? "文档"
                      : "压缩包"}
                    文件
                  </span>
                </label>
                {config.enabled && (
                  <div className="ml-6">
                    <div className="mb-2">
                      <label className="flex items-center mb-1">
                        <input
                          type="radio"
                          name={`${type}-mode`}
                          checked={config.mode === "inherit"}
                          onChange={() =>
                            setMediaTypes((prev) => ({
                              ...prev,
                              [type]: {
                                ...prev[type as keyof typeof prev],
                                mode: "inherit",
                              },
                            }))
                          }
                          className="mr-2"
                        />
                        <span className="text-xs text-gray-600">
                          继承预设格式
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`${type}-mode`}
                          checked={config.mode === "override"}
                          onChange={() =>
                            setMediaTypes((prev) => ({
                              ...prev,
                              [type]: {
                                ...prev[type as keyof typeof prev],
                                mode: "override",
                              },
                            }))
                          }
                          className="mr-2"
                        />
                        <span className="text-xs text-gray-600">
                          覆盖为自定义格式
                        </span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={config.extensions}
                      onChange={(e) =>
                        setMediaTypes((prev) => ({
                          ...prev,
                          [type]: {
                            ...prev[type as keyof typeof prev],
                            extensions: e.target.value,
                          },
                        }))
                      }
                      placeholder={
                        config.mode === "inherit"
                          ? "在预设基础上增加格式，如: tiff,raw"
                          : "输入文件扩展名，用逗号分隔"
                      }
                      className="w-full text-xs rounded border border-gray-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 下载配置 */}
        <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-3">下载配置</h3>

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              下载限制模式:
            </label>
            <select
              value={downloadMode}
              onChange={(e) =>
                setDownloadMode(e.target.value as "unlimited" | "limited")
              }
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="unlimited">不限制下载</option>
              <option value="limited">自定义限制</option>
            </select>
          </div>

          {downloadMode === "limited" && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  单个文件最大大小 (MB):
                </label>
                <input
                  type="number"
                  value={downloadLimits.maxFileSize}
                  onChange={(e) =>
                    setDownloadLimits((prev) => ({
                      ...prev,
                      maxFileSize: Number(e.target.value),
                    }))
                  }
                  min="1"
                  max="100000"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  总下载大小限制 (MB):
                </label>
                <input
                  type="number"
                  value={downloadLimits.maxTotalSize}
                  onChange={(e) =>
                    setDownloadLimits((prev) => ({
                      ...prev,
                      maxTotalSize: Number(e.target.value),
                    }))
                  }
                  min="1"
                  max="1000000"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  下载超时时间 (秒):
                </label>
                <input
                  type="number"
                  value={downloadLimits.downloadTimeout}
                  onChange={(e) =>
                    setDownloadLimits((prev) => ({
                      ...prev,
                      downloadTimeout: Number(e.target.value),
                    }))
                  }
                  min="5"
                  max="3600"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  并发下载数量:
                </label>
                <input
                  type="number"
                  value={downloadLimits.maxConcurrent}
                  onChange={(e) =>
                    setDownloadLimits((prev) => ({
                      ...prev,
                      maxConcurrent: Number(e.target.value),
                    }))
                  }
                  min="1"
                  max="50"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={downloadLimits.skipDuplicates}
              onChange={(e) =>
                setDownloadLimits((prev) => ({
                  ...prev,
                  skipDuplicates: e.target.checked,
                }))
              }
              className="mr-2"
            />
            <span className="text-sm text-gray-700">跳过重复文件</span>
          </label>
        </div>

        {/* 开始爬取按钮 */}
        <div className="flex gap-4">
          <button
            onClick={handleCrawl}
            disabled={isLoading}
            className={cn(
              "rounded-md px-6 py-2 text-sm font-medium text-white transition-colors",
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {isLoading ? "爬取中..." : "开始爬取"}
          </button>
        </div>
      </div>

      {/* 爬取结果 */}
      {crawlResult && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">爬取结果</h2>
          <div className="space-y-2 text-sm">
            <p>
              <strong>会话ID:</strong> {crawlResult.sessionId}
            </p>
            <p>
              <strong>URL:</strong> {crawlResult.url}
            </p>
            <p>
              <strong>状态:</strong>
              <span
                className={cn(
                  "ml-2 px-2 py-1 rounded text-xs",
                  crawlResult.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : crawlResult.status === "running"
                    ? "bg-blue-100 text-blue-800"
                    : crawlResult.status === "failed"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
                )}
              >
                {crawlResult.status}
              </span>
            </p>
            <p>
              <strong>开始时间:</strong>{" "}
              {new Date(crawlResult.startTime).toLocaleString()}
            </p>
            {crawlResult.endTime && (
              <p>
                <strong>结束时间:</strong>{" "}
                {new Date(crawlResult.endTime).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 会话列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">爬取会话</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "p-3 rounded border cursor-pointer transition-colors",
                  selectedSession === session.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => handleSelectSession(session.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {session.url}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(session.startTime).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      媒体文件: {session.mediaCount} 个
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "px-2 py-1 rounded text-xs",
                        session.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : session.status === "running"
                          ? "bg-blue-100 text-blue-800"
                          : session.status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      )}
                    >
                      {session.status}
                    </span>
                    {session.status === "running" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStopCrawl(session.id);
                        }}
                        className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        停止
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 媒体文件列表 */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">媒体文件</h2>
          {selectedSession ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sessionMedia.map((media) => (
                <div
                  key={media.fileName}
                  className="p-3 rounded border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {media.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {media.originalUrl}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        大小: {(media.fileSize / 1024).toFixed(1)} KB | 类型:{" "}
                        {media.mimeType}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleDownloadMedia(selectedSession, media.fileName)
                      }
                      className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                      下载
                    </button>
                  </div>
                </div>
              ))}
              {sessionMedia.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  该会话暂无媒体文件
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              请选择一个会话查看媒体文件
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrawlerTest;
