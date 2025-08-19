import { useState } from "react";
import { crawlerApi, mediaApi, fileApi } from "@/services/api";
import { cn } from "@/lib/utils";

interface ApiTestResult {
  endpoint: string;
  method: string;
  status: "success" | "error" | "pending";
  response?: unknown;
  error?: string;
  timestamp: string;
}

const ApiTest = () => {
  const [testResults, setTestResults] = useState<ApiTestResult[]>([]);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [testParams, setTestParams] = useState({
    startUrl: "https://example.com",
    sessionId: "",
    fileName: "",
    query: "test",
    fileType: "image",
  });

  const addTestResult = (result: Omit<ApiTestResult, "timestamp">) => {
    setTestResults((prev) => [
      {
        ...result,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
  };

  const testEndpoint = async (name: string, testFn: () => Promise<unknown>) => {
    const result: Omit<ApiTestResult, "timestamp"> = {
      endpoint: name,
      method: "GET",
      status: "pending",
    };

    addTestResult(result);

    try {
      const response = await testFn();
      addTestResult({
        ...result,
        status: "success",
        response: response,
      });
    } catch (error: unknown) {
      addTestResult({
        ...result,
        status: "error",
        error: error instanceof Error ? error.message : "请求失败",
      });
    }
  };

  const testCrawlerStart = () => {
    testEndpoint("POST /api/crawler/start", () =>
      crawlerApi.crawl({ 
        url: testParams.startUrl,
        options: {
          maxDepth: 2,
          maxPages: 10
        }
      })
    );
  };

  const testCrawlerSessions = () => {
    testEndpoint("GET /api/crawler/sessions", () => crawlerApi.getSessions());
  };

  const testCrawlerStop = () => {
    testEndpoint("POST /api/crawler/stop", () =>
      crawlerApi.stopCrawl("test-session-id")
    );
  };

  const testCrawlerStatus = () => {
    testEndpoint("GET /api/crawler/sessions", () => crawlerApi.getSessions());
  };

  const testMediaStats = () => {
    testEndpoint("GET /api/media/stats", () => mediaApi.getStats());
  };

  const testMediaSearch = () => {
    testEndpoint("GET /api/media/search", () =>
      mediaApi.search({
        query: testParams.query,
        fileType: testParams.fileType,
        page: 1,
        limit: 10,
      })
    );
  };

  const testMediaDownload = () => {
    if (!testParams.sessionId || !testParams.fileName) {
      alert("请输入会话ID和文件名");
      return;
    }
    testEndpoint("GET /api/media/download", () =>
      mediaApi.downloadMedia(testParams.sessionId, testParams.fileName)
    );
  };

  const testMediaStream = () => {
    if (!testParams.sessionId || !testParams.fileName) {
      alert("请输入会话ID和文件名");
      return;
    }
    const url = mediaApi.streamMedia(testParams.sessionId, testParams.fileName);
    window.open(url, "_blank");
    addTestResult({
      endpoint: "GET /api/media/stream",
      method: "GET",
      status: "success",
      response: { message: "已在新窗口打开流媒体链接", url },
    });
  };

  const testFileDownload = () => {
    if (!testParams.fileName) {
      alert("请输入文件名");
      return;
    }
    testEndpoint("GET /api/files/download", () =>
      fileApi.downloadFile(testParams.fileName)
    );
  };

  const testAllEndpoints = async () => {
    setIsTestingAll(true);
    setTestResults([]);

    const tests = [
      { name: "爬虫状态", fn: testCrawlerStatus },
      { name: "会话列表", fn: testCrawlerSessions },
      { name: "媒体统计", fn: testMediaStats },
      { name: "媒体搜索", fn: testMediaSearch },
    ];

    for (const test of tests) {
      await new Promise((resolve) => setTimeout(resolve, 500)); // 延迟500ms
      test.fn();
    }

    setIsTestingAll(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getStatusColor = (status: ApiTestResult["status"]) => {
    switch (status) {
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "pending":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = (status: ApiTestResult["status"]) => {
    switch (status) {
      case "success":
        return "✓";
      case "error":
        return "✗";
      case "pending":
        return "⏳";
      default:
        return "?";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">API 测试</h1>
        <p className="mt-2 text-muted-foreground">
          测试后端API接口的可用性和响应
        </p>
      </div>

      {/* 测试参数配置 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">测试参数</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">测试URL</label>
            <input
              type="text"
              value={testParams.startUrl}
              onChange={(e) =>
                setTestParams((prev) => ({ ...prev, startUrl: e.target.value }))
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">会话ID</label>
            <input
              type="text"
              value={testParams.sessionId}
              onChange={(e) =>
                setTestParams((prev) => ({
                  ...prev,
                  sessionId: e.target.value,
                }))
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              placeholder="输入会话ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">文件名</label>
            <input
              type="text"
              value={testParams.fileName}
              onChange={(e) =>
                setTestParams((prev) => ({ ...prev, fileName: e.target.value }))
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              placeholder="输入文件名"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">搜索关键词</label>
            <input
              type="text"
              value={testParams.query}
              onChange={(e) =>
                setTestParams((prev) => ({ ...prev, query: e.target.value }))
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              placeholder="搜索关键词"
            />
          </div>
        </div>
      </div>

      {/* API测试按钮 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">API 端点测试</h2>
          <div className="flex gap-2">
            <button
              onClick={testAllEndpoints}
              disabled={isTestingAll}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium text-primary-foreground transition-colors",
                isTestingAll
                  ? "bg-muted cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90"
              )}
            >
              {isTestingAll ? "测试中..." : "测试所有"}
            </button>
            <button
              onClick={clearResults}
              className="rounded-md px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              清空结果
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 爬虫相关API */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground">
              爬虫 API
            </h3>
            <button
              onClick={testCrawlerStart}
              className="w-full text-left rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              开始爬取
            </button>
            <button
              onClick={testCrawlerStop}
              className="w-full text-left rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              停止爬取
            </button>
            <button
              onClick={testCrawlerStatus}
              className="w-full text-left rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              爬虫状态
            </button>
            <button
              onClick={testCrawlerSessions}
              className="w-full text-left rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              会话列表
            </button>
          </div>

          {/* 媒体相关API */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground">
              媒体 API
            </h3>
            <button
              onClick={testMediaStats}
              className="w-full text-left rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              媒体统计
            </button>
            <button
              onClick={testMediaSearch}
              className="w-full text-left rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              媒体搜索
            </button>
            <button
              onClick={testMediaDownload}
              className="w-full text-left rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              媒体下载
            </button>
            <button
              onClick={testMediaStream}
              className="w-full text-left rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              媒体流
            </button>
          </div>

          {/* 文件相关API */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground">
              文件 API
            </h3>
            <button
              onClick={testFileDownload}
              className="w-full text-left rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              文件下载
            </button>
          </div>
        </div>
      </div>

      {/* 测试结果 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">测试结果</h2>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {testResults.map((result, index) => (
            <div
              key={index}
              className="p-4 rounded border border-border bg-background"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn("text-lg", getStatusColor(result.status))}
                  >
                    {getStatusIcon(result.status)}
                  </span>
                  <span className="font-medium text-sm">{result.endpoint}</span>
                  <span className="text-xs text-muted-foreground">
                    {result.method}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {result.timestamp}
                </span>
              </div>

              {result.response && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">响应:</p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {typeof result.response === "string"
                      ? result.response
                      : (JSON.stringify(result.response, null, 2) as string)}
                  </pre>
                </div>
              )}

              {result.error && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">错误:</p>
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    {result.error}
                  </p>
                </div>
              )}
            </div>
          ))}

          {testResults.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              暂无测试结果
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiTest;
