# 第四章扩展：web_search 工具（托管搜索）设计

日期：2026-11-19
状态：已实现（2026-11-19，待人工核验）

## 背景

第四章 DeepAgent 已带文件工具，现有 `internal/httptool` 只提供受限 GET 抓取（`http_get`）。用户希望补齐主流 agent 的联网检索能力。

实测（2026-11-19，`NEW_API_*` 指向 `kssapi.com/v1`，模型 `gpt-6-luna`）：

- `POST /v1/responses` + `tools: [{"type":"web_search"}]` → 200，输出含 `web_search_call`（`action.type=search|open_page`）、`tool_usage.web_search.num_requests=1`、`url_citation` 注解 → 接口确实支持服务端托管搜索；
- `chat/completions` + `web_search_options` → 200 但被忽略（无 annotations、无 tool_usage）；
- `chat/completions` + `tools:[{"type":"web_search"}]` → 400 `Unknown parameter: 'tools[0].function'`；
- `eino-ext/components/model/openai@v0.1.13` 不支持 Responses API，Eino 的模型层到不了托管搜索。

因此由我们自己实现工具去调托管搜索（方案 B）。它与 DSH 的 `dsh-web-search-deepseek` 同构：工具层不联网，provider 层用"带搜索工具的模型请求"委托服务端执行；只是协议从 Anthropic Messages 换成 OpenAI Responses。

## 目标

- DeepAgent 版新增 `web_search` 工具：单 query，返回摘要 + 来源列表，带不可信内容标记与引用要求。
- 现有 `http_get` 改名 `web_fetch`，与搜索配成主流的一对。
- 复用 `NEW_API_BASE_URL` / `NEW_API_KEY` / `NEW_API_MODEL`，不新增第三方账号；不新增 Go 依赖（标准库 `net/http`）。

## 非目标

- 不改 Eino 模型层，不自写 Responses API 的 model 组件。
- `manual-tools` 入口不加联网工具，保持"逐个注册 Tool"对照案例的最小性。
- 不做多 query 合并、结果缓存、重试、并行搜索。
- 不接 Tavily / SearXNG 等外部 provider（`Searcher` 接口保留为扩展点）。

## 约束

- 每次搜索 = 一轮额外模型调用（实测输入约 8.7k tokens，含缓存命中 4k），有延迟与费用；该事实写进工具描述和文档（已实现）。
- 请求显式带 `store:false`（2026-11-19 本机实测端点返回 200），避免服务端保留搜索 prompt 与结果。
- 测试零网络：`HostedSearcher` 用 `httptest` 假服务器；工具测试用假 `Searcher`。
- key 只在内存中放进请求头，不打印、不落盘；错误信息不含 key。
- 搜索结果按外部不可信内容处理（提示注入的常见入口）。

## 方案对比（用户已选 B）

| 方案 | 做法 | 结论 |
|---|---|---|
| A：自写 Responses 模型组件 | 让托管搜索直接进 agent 循环 | 要重写 model 层，且与 Eino 的 chat-completions 工具调用模型对不上，改动过大 → 否 |
| B：工具转调 `/responses` | `web_search` 工具内部发一次带 `web_search` 托管工具的请求 | **选中**：零注册、复用现有 key、与 DSH 同构；代价是额外 token 与延迟 |
| C：接外部搜索 API | 工具内部调 SearXNG / Tavily / 博查 | 不烧模型 token、结果可控，但要注册或起服务；留作 `Searcher` 的后续实现 |

## 设计

### 包结构：`internal/webtool`（由 `internal/httptool` 重命名）

- `fetch.go`：搬移现有 GET 逻辑，`ToolName` 改为 `web_fetch`，输出与错误前缀同步改名。
- `search.go`：

  ```go
  type Source struct { Title, URL, Snippet string }
  type SearchResult struct { Answer string; Sources []Source }
  type Searcher interface {
      Search(ctx context.Context, query string) (SearchResult, error)
  }
  func NewSearchTool(searcher Searcher) (tool.BaseTool, error)
  ```

  工具参数 `{ "query": string }`，`TrimSpace` 后拒绝空值。输出格式：不可信内容标记 → 摘要 → `Sources:` 列表（`- [title](url)`，有 snippet 才附）→ "引用来源"指令；无来源时说明"未返回来源，仅摘要"。
- `hosted.go`：

  ```go
  type HostedOptions struct {
      BaseURL, APIKey, Model string
      Timeout    time.Duration // 默认 60s
      HTTPClient *http.Client  // 测试注入
  }
  func NewHostedSearcher(opts HostedOptions) (*HostedSearcher, error)
  ```

  `Search` 发 `POST {BaseURL}/responses`：

  ```json
  {"model": "<NEW_API_MODEL>",
   "input": "Search the web for: <query>. Answer concisely and keep source URLs.",
   "tools": [{"type": "web_search"}],
   "max_output_tokens": 600}
  ```

  解析 `output[]`：`message` → `content[type=output_text]` 的 `text` 作为 `Answer`；其 `annotations[type=url_citation]` 的 `url`/`title` 作为 `Sources`。HTTP 非 2xx、错误体、坏 JSON、无 `output_text` 都返回带状态码与截断 body 的错误；响应体读取上限 1 MiB。

### 装配

- `toolfilesystem.Options` 增加内部字段 `Searcher webtool.Searcher`（不加 CLI 参数，仅用于装配与测试注入）。
- `run()` 用 `shared.LoadConfig()` 的 BaseURL/APIKey/Model 构建 `HostedSearcher`，并写入 `opts.Searcher`；构建失败在启动时直接报错。
- `newAgent`：`web_fetch` 始终注册；`web_search` 仅在 `Searcher != nil` 时注册；Description 更新为同时提到两个联网工具。
- 失败语义（按 Eino v0.9.5 实际行为修正）：工具返回 error 时 `compose/tool_node.go` 会让整个 Runner 失败，`run()` 上抛错误、进程退出，只保留已保存的用户消息；不会把错误文本交回模型继续，也不自动重试。
- 成本提示：启动信息与文档说明"每次 web_search 会额外消耗一轮模型调用"。

### 测试

- `webtool/fetch_test.go`：原 `httptool` 用例迁移，工具名/输出前缀改为 `web_fetch`。
- `webtool/hosted_test.go`：`httptest` 断言方法/路径/`Authorization`/body 含 `tools[0].type=web_search` 与 query；解析摘要 + `url_citation`；HTTP 400/500、error 体、坏 JSON、缺 `output_text`、超时、响应超限。
- `webtool/search_test.go`：假 `Searcher`；空 query、searcher 报错、输出含警示/来源/引用提示。
- `toolfilesystem`：注册断言更新（有 `Searcher` 时含 `web_search`，无则不注册）；新增端到端测试——scriptedModel 先发 `web_search` 调用再回答，断言输出含来源且完整工具链被持久化。
- 文档：`docs/ch04-tool-filesystem.md` 的 `http_get` 小节改写为"联网工具：`web_search` + `web_fetch`"，含实测证据、成本、限制与扩展点。

### 验证

`gofmt`、`CGO_ENABLED=0 go vet ./...`、`make test`、`make build`、`git diff --check`。真实联网 smoke 只在用户要求演示时跑（会消耗 key 与搜索费用）。

## 待定

无。实现细节（提示文案、`max_output_tokens` 取值）由实现者确定。
