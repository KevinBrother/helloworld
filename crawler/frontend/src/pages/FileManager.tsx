import React, { useState } from 'react';
import type { FileInfo } from '@/types/api';

interface StreamState {
  isStreaming: boolean;
  processedFiles: number;
  batchCount: number;
  status: "idle" | "connecting" | "loading" | "completed" | "error";
  error?: string;
}

const FileManager: React.FC = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [queryType, setQueryType] = useState<"all" | "session" | "prefix">(
    "all"
  );
  const [queryValue, setQueryValue] = useState("");
  const [totalFiles, setTotalFiles] = useState(0);
  const [streamState, setStreamState] = useState<StreamState>({
    isStreaming: false,
    processedFiles: 0,
    batchCount: 0,
    status: "idle",
  });

  const [maxFiles, setMaxFiles] = useState(1000);
  const [batchSize, setBatchSize] = useState(50);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [previewFile, setPreviewFile] = useState<{
    fileName: string;
    url: string;
  } | null>(null);
  const [groupByDomain, setGroupByDomain] = useState(false);

  // 从URL中提取域名
  const extractDomain = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '未知域名';
    }
  };

  // 按域名分组文件
  const groupFilesByDomain = (files: FileInfo[]) => {
    if (!groupByDomain) return { '所有文件': files };
    
    return files.reduce((groups: { [key: string]: FileInfo[] }, file) => {
      const domain = file.originalUrl ? extractDomain(file.originalUrl) : '未知域名';
      if (!groups[domain]) {
        groups[domain] = [];
      }
      groups[domain].push(file);
      return groups;
    }, {});
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 获取文件图标
  const getFileIcon = (fileName: string): string => {
    if (!fileName || typeof fileName !== "string") {
      return "📄";
    }
    const ext = fileName.toLowerCase().split(".").pop() || "";
    const iconMap: { [key: string]: string } = {
      pdf: "📕",
      doc: "📘",
      docx: "📘",
      xls: "📗",
      xlsx: "📗",
      ppt: "📙",
      pptx: "📙",
      txt: "📄",
      jpg: "🖼️",
      jpeg: "🖼️",
      png: "🖼️",
      gif: "🖼️",
      webp: "🖼️",
      mp4: "🎬",
      avi: "🎬",
      mov: "🎬",
      wmv: "🎬",
      mp3: "🎵",
      wav: "🎵",
      flac: "🎵",
      zip: "📦",
      rar: "📦",
      "7z": "📦",
      html: "🌐",
      htm: "🌐",
      css: "🎨",
      js: "⚡",
      ts: "⚡",
      json: "📊",
      xml: "📋",
    };
    return iconMap[ext] || "📄";
  };

  // 判断文件是否可预览
  const canPreview = (fileName: string): boolean => {
    // const ext = fileName.toLowerCase().split('.').pop() || '';
    // const previewableExts = [
    //   'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp',
    //   'mp4', 'webm', 'ogg',
    //   'mp3', 'wav', 'ogg', 'm4a',
    //   'pdf'
    // ];
    // return previewableExts.includes(ext);
    return true;
  };

  // 流式查询文件
  const listFilesStream = () => {
    if (streamState.isStreaming) {
      return;
    }

    // 构建查询参数
    let url = `/api/files/stream?maxFiles=${maxFiles}&batchSize=${batchSize}`;
    if (queryType === "session" && queryValue.trim()) {
      url += `&sessionId=${encodeURIComponent(queryValue.trim())}`;
    } else if (queryType === "prefix" && queryValue.trim()) {
      url += `&prefix=${encodeURIComponent(queryValue.trim())}`;
    }

    // 重置状态
    setFiles([]);
    setTotalFiles(0);
    setStreamState({
      isStreaming: true,
      processedFiles: 0,
      batchCount: 0,
      status: "connecting",
    });

    // 创建EventSource
    const es = new EventSource(url);
    setEventSource(es);

    es.onopen = () => {
      setStreamState((prev) => ({ ...prev, status: "loading" }));
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "batch") {
          setFiles((prev) => [...prev, ...data.files]);
          setStreamState((prev) => ({
            ...prev,
            processedFiles: prev.processedFiles + data.files.length,
            batchCount: prev.batchCount + 1,
          }));
        } else if (data.type === "complete") {
          setTotalFiles(data.totalFiles);
          setStreamState((prev) => ({ ...prev, status: "completed" }));
          es.close();
          setEventSource(null);
        } else if (data.type === "error") {
          setStreamState((prev) => ({
            ...prev,
            status: "error",
            error: data.message,
            isStreaming: false,
          }));
          es.close();
          setEventSource(null);
        }
      } catch (error) {
        console.error("解析SSE数据失败:", error);
      }
    };

    es.onerror = () => {
      setStreamState((prev) => ({
        ...prev,
        status: "error",
        error: "连接服务器失败",
        isStreaming: false,
      }));
      es.close();
      setEventSource(null);
    };
  };

  // 停止流式加载
  const stopStreaming = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setStreamState((prev) => ({ ...prev, isStreaming: false, status: "idle" }));
  };

  // 下载文件
  const handleDownloadFile = async (fileName: string) => {
    try {
      const response = await fetch(
        `/api/files/${encodeURIComponent(fileName)}/download`
      );
      const data = await response.json();

      if (response.ok) {
        const fixedUrl = data.downloadUrl.replace(
          "http://minio:9000",
          "http://localhost:9001"
        );
        window.open(fixedUrl, "_blank");
      } else {
        alert(`下载失败: ${data.message || "未知错误"}`);
      }
    } catch (error) {
      alert(`网络错误: ${(error as Error).message}`);
    }
  };

  // 复制链接
  const handleCopyLink = async (fileName: string) => {
    try {
      const response = await fetch(
        `/api/files/${encodeURIComponent(fileName)}/download`
      );
      const data = await response.json();

      if (response.ok) {
        const fixedUrl = data.downloadUrl.replace(
          "http://minio:9000",
          "http://localhost:9001"
        );
        const text = fixedUrl;

        navigator.clipboard
          .writeText(text)
          .then(() => {
            alert("链接已复制到剪贴板");
          })
          .catch(() => {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            alert("链接已复制到剪贴板");
          });
      } else {
        alert(`获取链接失败: ${data.message || "未知错误"}`);
      }
    } catch (error) {
      alert(`网络错误: ${(error as Error).message}`);
    }
  };

  // 预览文件
  const handlePreviewFile = async (fileName: string) => {
    try {
      const response = await fetch(
        `/api/files/${encodeURIComponent(fileName)}/download`
      );
      const data = await response.json();

      if (response.ok) {
        const fixedUrl = data.downloadUrl.replace(
          "http://minio:9000",
          "http://localhost:9001"
        );
        setPreviewFile({ fileName, url: fixedUrl });
      } else {
        alert(`获取预览链接失败: ${data.message || "未知错误"}`);
      }
    } catch (error) {
      alert(`网络错误: ${(error as Error).message}`);
    }
  };

  // 渲染预览模态框
  const renderPreviewModal = () => {
    if (!previewFile) return null;

    const { fileName, url } = previewFile;
    const ext = fileName.toLowerCase().split(".").pop() || "";

    let previewContent;

    if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) {
      previewContent = (
        <img
          src={url}
          alt={fileName}
          className="max-w-full max-h-[80vh] object-contain"
          onError={() => alert("图片加载失败")}
        />
      );
    } else if (["mp4", "webm", "ogg"].includes(ext)) {
      previewContent = (
        <video controls className="max-w-full max-h-[80vh]" preload="metadata">
          <source src={url} type={`video/${ext}`} />
          您的浏览器不支持视频播放。
        </video>
      );
    } else if (["mp3", "wav", "ogg", "m4a"].includes(ext)) {
      previewContent = (
        <audio controls preload="metadata">
          <source src={url} type={`audio/${ext}`} />
          您的浏览器不支持音频播放。
        </audio>
      );
    } else if (ext === "pdf") {
      previewContent = (
        <iframe src={url} className="w-full h-[80vh] border-none" />
      );
    } else if (ext === "json") {
      previewContent = (
        <div className="w-full h-[80vh] overflow-auto">
          <iframe 
            src={`data:text/html;charset=utf-8,${encodeURIComponent(`
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: monospace; margin: 20px; background: #f5f5f5; }
                  pre { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: auto; }
                  .json-key { color: #0066cc; }
                  .json-string { color: #009900; }
                  .json-number { color: #cc6600; }
                  .json-boolean { color: #cc0066; }
                  .json-null { color: #999999; }
                </style>
              </head>
              <body>
                <h3>JSON 文件预览</h3>
                <pre id="json-content">正在加载...</pre>
                <script>
                  fetch('${url}')
                    .then(response => response.text())
                    .then(text => {
                      try {
                        const parsed = JSON.parse(text);
                        const formatted = JSON.stringify(parsed, null, 2);
                        document.getElementById('json-content').innerHTML = syntaxHighlight(formatted);
                      } catch (e) {
                        document.getElementById('json-content').textContent = '无法解析JSON: ' + e.message + '\n\n原始内容:\n' + text;
                      }
                    })
                    .catch(err => {
                      document.getElementById('json-content').textContent = '加载失败: ' + err.message;
                    });
                  
                  function syntaxHighlight(json) {
                    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                      var cls = 'json-number';
                      if (/^"/.test(match)) {
                        if (/:$/.test(match)) {
                          cls = 'json-key';
                        } else {
                          cls = 'json-string';
                        }
                      } else if (/true|false/.test(match)) {
                        cls = 'json-boolean';
                      } else if (/null/.test(match)) {
                        cls = 'json-null';
                      }
                      return '<span class="' + cls + '">' + match + '</span>';
                    });
                  }
                </script>
              </body>
              </html>
            `)}`}
            className="w-full h-full border-none"
          />
        </div>
      );
    } else {
      previewContent = (
        <div className="text-center p-8">
          <h3 className="text-lg font-semibold mb-2">
            🚫 暂不支持预览此文件类型
          </h3>
          <p className="text-gray-600 mb-2">文件类型: .{ext}</p>
          <p className="text-gray-600 mb-4">请点击下载按钮下载文件查看</p>
          <button
            onClick={() => window.open(url, "_blank")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            ⬇️ 下载文件
          </button>
        </div>
      );
    }

    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setPreviewFile(null);
          }
        }}
      >
        <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">预览: {fileName}</h3>
            <button
              onClick={() => setPreviewFile(null)}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
          <div className="p-4">{previewContent}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        🗂️ 爬取结果查询与管理
      </h1>

      {/* 查询控件 */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              查询类型
            </label>
            <select
              value={queryType}
              onChange={(e) =>
                setQueryType(e.target.value as "all" | "session" | "prefix")
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有文件</option>
              <option value="session">按会话ID</option>
              <option value="prefix">按前缀</option>
            </select>
          </div>

          {queryType !== "all" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {queryType === "session" ? "会话ID" : "前缀"}
              </label>
              <input
                type="text"
                value={queryValue}
                onChange={(e) => setQueryValue(e.target.value)}
                placeholder={
                  queryType === "session" ? "输入会话ID" : "输入前缀"
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最大文件数
            </label>
            <input
              type="number"
              value={maxFiles}
              onChange={(e) => setMaxFiles(Number(e.target.value))}
              min={1}
              max={10000}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              批次大小
            </label>
            <input
              type="number"
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              min={10}
              max={200}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={listFilesStream}
              disabled={streamState.isStreaming}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {streamState.isStreaming ? "🔄 查询中..." : "🔍 流式查询"}
            </button>

            {streamState.isStreaming && (
              <button
                onClick={stopStreaming}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center gap-2"
              >
                ⏹️ 停止
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={groupByDomain}
                onChange={(e) => setGroupByDomain(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              🌐 按域名分组
            </label>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <span className="text-2xl mr-2">📁</span>
            <div>
              <p className="text-sm text-gray-600">总文件数</p>
              <p className="text-xl font-bold text-blue-600">{totalFiles}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <span className="text-2xl mr-2">📋</span>
            <div>
              <p className="text-sm text-gray-600">当前显示</p>
              <p className="text-xl font-bold text-green-600">{files.length}</p>
            </div>
          </div>
        </div>
        {streamState.isStreaming && (
          <>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <span className="text-2xl mr-2">⚡</span>
                <div>
                  <p className="text-sm text-gray-600">状态</p>
                  <p className="text-xl font-bold text-purple-600">
                    {streamState.status}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <span className="text-2xl mr-2">📦</span>
                <div>
                  <p className="text-sm text-gray-600">批次 / 已处理</p>
                  <p className="text-xl font-bold text-orange-600">
                    {streamState.batchCount} / {streamState.processedFiles}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 错误信息 */}
      {streamState.status === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <span className="text-red-500 text-xl mr-2">⚠️</span>
            <div>
              <h3 className="text-red-800 font-semibold">查询出错</h3>
              <p className="text-red-600">{streamState.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 文件列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">文件列表</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {files.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <span className="text-4xl mb-2 block">📂</span>
              <p>暂无文件数据</p>
              <p className="text-sm">请点击"流式查询"按钮开始查询</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupFilesByDomain(files)).map(([domain, domainFiles]) => (
                <div key={domain} className="space-y-3">
                  {groupByDomain && (
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200 mx-4">
                      <h3 className="text-lg font-medium text-gray-700">🌐 {domain}</h3>
                      <span className="text-sm text-gray-500">({domainFiles.length} 个文件)</span>
                    </div>
                  )}
                  {domainFiles.map((file, index) => (
                    <div key={`${domain}-${file.name}-${index}`} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <span className="text-2xl">
                            {getFileIcon(file.name)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(file.size)} •{" "}
                              {new Date(file.lastModified).toLocaleString()}
                            </p>
                            {file.originalUrl && (
                              <p className="text-xs text-blue-600 truncate" title={file.originalUrl}>
                                🔗 原始链接: {file.originalUrl}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {canPreview(file.name) && (
                            <button
                              onClick={() => handlePreviewFile(file.name)}
                              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                              title="预览文件"
                            >
                              👁️ 预览
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadFile(file.name)}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                            title="下载文件"
                          >
                            ⬇️ 下载
                          </button>
                          <button
                            onClick={() => handleCopyLink(file.name)}
                            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                            title="复制链接"
                          >
                            🔗 复制
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 预览模态框 */}
      {renderPreviewModal()}
    </div>
  );
};

export default FileManager;
