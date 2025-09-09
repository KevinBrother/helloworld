# crawlee-share

## 简介

### 支持

- 支持 url 过滤与爬虫队列管理
- 支持动态管理并发控制 （AutoscaledPool）
- 支持多浏览器实例管理
- 请求代理池的配置
- 支持反爬（模拟人类行为，浏览器伪装）
- 默认支持 a 标签的抓取，并自动放到队列，可手动过滤，可手动添加额外链接到队列
- 爬去的结果默认支持磁盘级别的数据存储，可自己实现对接其他存储方式，但不是很方便，目前还没实现
- 支持是否遵守反爬协议
- 支持爬去策略：同源、同主机、同域名 `EnqueueStrategy`, 默认  SameDomain
- 可对接多种爬虫方式，其中 AdaptivePlaywrightCrawler （实验阶段）类默认支持检测是静态界面还是动态渲染页面，并自动选择使用 http 请求还是 playwright 来爬取

### 需要自己实现

- 图片等资源文件链接不会解析，也不会放到队列，可自己解析页面获取，也可通过 `enqueueLinks` 配置。
- CAPTCHA、滑块、浏览器指纹等提供钩子，可以自己结合第三方库实现。
- 无任务管理，需要自己实现。

## 重要参数

- [RequestQueue](https://crawlee.dev/js/api/core/class/RequestQueue)
  - 默认url 去重, 通过由 URL 生成的 uniqueKey 匹配
  - 默认内存和本地文件存储，也可手动实现对接 redis

- [requestHandler](https://crawlee.dev/js/api/basic-crawler/interface/BasicCrawlerOptions#requestHandler)
  - 处理每个请求的核心逻辑

- enqueueLinks
  - 自动提取页面中的链接并添加到请求队列
  - 可手动添加链接到队列
  - 可配置过滤规则

- AutoscaledPool
  - maxConcurrency: 最大并发数，影响同时运行的浏览器实例数量
  - minConcurrency: 最小并发数

- BrowserPool 相关
  - 控制浏览器实例的生命周期和数量
  - maxOpenPagesPerBrowser: 每个浏览器实例允许的最大页面数，浏览器有最多打开的页面数限制

  ``` typescript
  // 会启动 3 个浏览器实例，每个实例最多打开 9 个页面
  {
    maxConcurrency: 20,
    browserPoolOptions: { maxOpenPagesPerBrowser: 9 },
  }
  ```
