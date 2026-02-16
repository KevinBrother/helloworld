# 学习路线图：Agent 应用开发（JS/TS 路线）

> 生成时间：2025-02-16
> 技术栈：Vercel AI SDK + LangChain.js
> 预计周期：6-8周（每周10-15小时）

---

## 一、核心价值与定位

### 是什么
**Agent（智能代理）** = LLM大模型 + Tools（工具） + Memory（记忆） + Planning（规划能力）

让AI不仅能对话，还能**自主思考、调用工具、执行复杂任务**。

### 为什么学
| 原因 | 说明 |
|------|------|
| 🔴 市场爆发 | 2025年是Agent应用元年，企业需求激增 |
| 🟢 裁剪抗性 | AI能力是35岁后核心竞争力，抗替代能力强 |
| 🟡 创业协同 | 直接赋能你的RAG创业项目 |
| 🟢 技术契合 | JS/TS路线，无缝对接你的React/Node技能 |

### 学完能做什么
1. **智能爬虫Agent** - 自动分析网页结构、动态调整爬取策略
2. **文档QA系统** - 为创业项目增强问答能力
3. **个人知识库Agent** - 本地向量搜索 + LLM问答
4. **工作流自动化** - 结合你的RPA经验，做智能流程自动化
5. **车机/智能家居Agent** - 利用小米汽车+米家生态做创新应用

---

## 二、前置知识检查

### 前置条件评估

| 前置条件 | 关键程度 | 用户状态 | 处理方式 |
|---------|---------|---------|---------|
| JavaScript/TypeScript | 🔴 关键 | ✅ 10年经验 | 无需处理 |
| React 前端开发 | 🔴 关键 | ✅ 精通 | 无需处理 |
| Node.js 后端开发 | 🟡 重要 | ✅ 3年经验 | 无需处理 |
| 异步编程(Promise/async) | 🔴 关键 | ✅ 精通 | 无需处理 |
| LLM 基础概念 | 🟡 重要 | ⚠️ 需补充 | 路线图中说明 |
| 向量数据库 | 🟢 可选 | ❌ 不具备 | 边学边用 |

**✅ 前置条件检查通过** - 你完全具备开始学习的基础！

---

## 三、知识对照表（已有知识映射）

> 🎯 **核心策略：以旧带新** - 充分利用你已有的10年前端+3年全栈经验

### 3.1 概念对照表

| Agent概念 | 你已有的类似知识 | 相似度 | 学习提示 & 差异点 |
|-----------|----------------|-------|------------------|
| **LLM 调用** | `fetch()` / Axios 请求API | ⭐⭐⭐⭐⭐ | 完全相同，只是endpoint不同 + 流式响应 |
| **Chain（链）** | Redux中间件链 / Express中间件 | ⭐⭐⭐⭐ | 数据流转模式一致；LLM输出是非确定性的 |
| **Tool（工具）** | 函数 / API封装 | ⭐⭐⭐⭐⭐ | 几乎相同；需要添加JSON Schema描述让LLM理解 |
| **Agent** | 带决策逻辑的Controller | ⭐⭐⭐⭐ | 逻辑不是你写死的，是LLM动态决定的 |
| **Prompt模板** | React组件props / 模板字符串 | ⭐⭐⭐⭐⭐ | 几乎相同；注意变量注入格式 |
| **流式输出** | Server-Sent Events / WebSocket | ⭐⭐⭐⭐⭐ | 你熟悉的技术；AI SDK封装好了 |
| **Memory（记忆）** | Redux Store / Session/LocalStorage | ⭐⭐⭐⭐ | 概念相同；需要关注Token限制 |
| **RAG检索** | 数据库查询 + 搜索引擎 | ⭐⭐⭐⭐ | 相似；关键是向量化 + 语义搜索 |
| **Function Calling** | RPC / GraphQL | ⭐⭐⭐⭐ | 模式一致；LLM自动选择调用哪个函数 |
| **Agent编排** | 工作流引擎 / 状态机 | ⭐⭐⭐⭐ | 你做过RPA，这个概念很熟悉 |

### 3.2 全新概念（无对照，需重点学习）

| 新知识概念 | 为什么没有对照 | 重要程度 | 学习建议 |
|-----------|---------------|---------|---------|
| **Prompt Engineering** | 这是与LLM"沟通"的艺术，传统编程没有 | 🔴 极高 | **重点掌握**，决定了Agent质量 |
| **Token 计费 & 限制** | 传统API按请求计费，LLM按Token | 🔴 极高 | 必须理解，影响成本和设计 |
| **向量嵌入(Embedding)** | 把文本变成数学向量的过程 | 🟡 中等 | 理解概念，工具会处理细节 |
| **温度/Temperature** | 控制输出随机性的参数(0-1) | 🟡 中等 | 理解即可：0=确定性，1=创造性 |
| **ReAct 模式** | Reasoning + Acting的Agent思维模式 | 🟡 中等 | 理解"思考-行动-观察"循环 |
| **系统提示词** | 预设的角色/行为指令 | 🔴 极高 | **必须掌握**，塑造Agent性格 |

---

## 四、核心学习路径（按20/80原则筛选）

> 📌 **技术选型建议**：优先 **Vercel AI SDK**，需要复杂编排时补充 **LangChain.js**

### 阶段1：基础速通（预计 5-7天，10-15小时）

#### 目标：跑通第一个 AI 对话，理解核心概念

- [ ] **1.1 LLM 基础概念**（2小时）
  - 学习要点：
    - Token 是什么（1 Token ≈ 0.75个英文词，约4字符）
    - 模型选择：GPT-4o vs Claude 3.5 vs 本地模型
    - API Key 获取与计费
  - 实操：申请 OpenAI/Anthropic API Key

- [ ] **1.2 Vercel AI SDK 快速入门**（3小时）
  - 学习要点：
    - 安装：`npm install ai`
    - 核心API：`generateText()` 和 `streamText()`
    - 在 React 中使用 `useChat()` hook
  - 实操练习：
    ```bash
    # 创建第一个AI聊天应用
    npx create-next-app@latest my-first-ai
    npm install ai @ai-sdk/openai
    ```
  - 验收：实现一个简单聊天界面，能流式输出回复

- [ ] **1.3 Prompt Engineering 入门**（3小时）
  - 学习要点：
    - 系统提示词 vs 用户提示词
    - 角色设定、任务描述、输出格式
    - Few-shot 示例（给例子比说规则更有效）
  - 实操：写一个"代码审查助手"的Prompt

---

### 阶段2：核心技能（预计 10-14天，20-25小时）

#### 目标：掌握 Tool Calling 和 RAG，能构建实用 Agent

- [ ] **2.1 Function Calling（工具调用）**（8小时）
  - 关键概念：LLM能"看懂"你的函数描述，按需调用
  - 学习要点：
    ```typescript
    // Vercel AI SDK 工具定义
    const tools = {
      getWeather: {
        description: "获取指定城市的天气",
        parameters: z.object({
          city: z.string().describe("城市名称"),
        }),
        execute: async ({ city }) => {
          // 你的实现
          return `${city}今天晴天，25°C`;
        },
      },
    };
    ```
  - 实战小项目：**天气查询Agent**
    - 用户用自然语言问天气
    - Agent 调用工具获取数据
    - 用自然语言返回结果

- [ ] **2.2 RAG 基础（检索增强生成）**（8小时）
  - 关键概念：给LLM"外挂大脑"，让它能回答私有数据
  - 学习要点：
    - 文档切片（Chunking）
    - 向量化（Embedding）
    - 向量数据库存储
    - 检索 + 生成
  - 推荐技术栈：
    ```bash
    npm install @ai-sdk/openai ai
    npm install @xenova/transformers  # 本地向量（用你的3090）
    # 或用云服务：Pinecone / Supabase Vector
    ```
  - 实战小项目：**文档QA Agent**
    - 上传技术文档
    - 向量存储
    - 问答检索

- [ ] **2.3 Agent 记忆系统**（5小时）
  - 学习要点：
    - 短期记忆：对话历史管理
    - 长期记忆：重要信息持久化
    - Vercel AI SDK 的记忆管理
  - 实战：给聊天添加"记住用户偏好"功能

- [ ] **2.4 多Agent协作**（4小时）
  - 学习要点：
    - Agent 分工：研究员、写作、审核
    - LangGraph.js 编排（如需要）
  - 实战：**内容生成流水线** - 研究Agent → 写作Agent → 审核Agent

---

### 阶段3：综合实战（预计 15-20天，30-40小时）

#### 目标：构建生产级 Agent 应用

- [ ] **项目1：智能爬虫 Agent**（优先推荐，结合你的RPA经验）
  - 场景：输入目标网站和要抓取的数据，Agent自动分析并爬取
  - 覆盖知识点：
    - 多工具调用（网页分析、爬虫、数据清洗）
    - 动态决策策略
    - 错误重试
  - 技术栈：
    ```typescript
    - Vercel AI SDK（Agent核心）
    - Crawlee（你熟悉的爬虫框架）
    - Cheerio/Playwright（网页解析）
    ```
  - 验收标准：
    - [ ] 输入URL，Agent能识别页面结构
    - [ ] 能处理反爬（限流、验证码识别）
    - [ ] 输出结构化数据（JSON/CSV）
    - [ ] 有友好的Web界面

- [ ] **项目2：个人知识库 Agent**（推荐，本地部署）
  - 场景：本地文档库 + AI问答，隐私安全
  - 覆盖知识点：
    - 本地向量存储
    - PDF/Word/Markdown 解析
    - 语义搜索
    - 来源引用
  - 技术栈：
    ```typescript
    - Next.js + Vercel AI SDK
    - 本地向量：用你的3090跑 embedding 模型
    - 文档解析：pdf-parse, mammoth
    - 向量库：SQLite-VSS 或 pgvector
    ```
  - 验收标准：
    - [ ] 支持拖拽上传文档
    - [ ] 问答有来源标注
    - [ ] 支持多轮对话追问
    - [ ] 本地运行，数据不出域

- [ ] **项目3：创业项目增强 Agent**（强烈推荐，直接产出）
  - 场景：为你的RAG创业项目添加Agent能力
  - 实现方向：
    - 智能文档解析Agent（对接组员A的模块）
    - QA增强Agent（对接组员B的模块）
    - 用户意图分析Agent
  - 验收标准：
    - [ ] 集成到现有React前端
    - [ ] 提升用户体验（更自然、更智能）
    - [ ] 可演示给潜在客户

- [ ] **项目4（进阶）：小米车机 Agent**（创新方向）
  - 场景：车机语音助手 + 智能场景联动
  - 技术探索：小米 HyperOS 开发平台
  - 验收：Demo 级别即可

---

## 五、避坑指南

### ❌ 常见错误

| 错误 | 解决方案 |
|------|---------|
| Prompt太复杂，LLM理解偏差 | 用Few-shot示例替代长描述 |
| 不控制Token消耗，账单爆炸 | 设置maxTokens，监控用量 |
| 工具描述不清晰，LLM乱调用 | 写详细的description和参数说明 |
| 流式输出处理不当，前端卡顿 | 用AI SDK的useChat hook，已优化 |
| 过度依赖Agent，简单任务也用 | 明确Agent适用场景：复杂决策/多步骤 |

### ⚠️ 容易浪费时间的地方

| 陷阱 | 建议 |
|------|------|
| 啃太多理论，不动手 | 边学边做，跑通代码最重要 |
| 追求完美Prompt | 好的Prompt是迭代出来的 |
| 学完Python再学JS | 直接学Vercel AI SDK，JS路线更高效 |
| 同时学LangChain和AI SDK | 先精通AI SDK，需要时再学LangChain |
| 本地部署大模型（初期） | 用API快速验证，本地化是优化手段 |

---

## 六、学习资源推荐

### 📖 官方文档（必看）

| 资源 | 链接 | 重点 |
|------|------|------|
| Vercel AI SDK 文档 | [sdk.vercel.ai/docs](https://sdk.vercel.ai/docs) | 核心API、教程 |
| AI SDK Examples | [github.com/vercel/ai](https://github.com/vercel/ai) | 可直接copy的代码 |
| LangChain.js 文档 | [js.langchain.com](https://js.langchain.com/) | 需要复杂编排时参考 |

### 🎬 精选教程

| 资源 | 类型 | 时长 | 说明 |
|------|------|------|------|
| Vercel AI SDK Quickstart | 文档+视频 | 1h | 官方入门 |
| [Top 5 TypeScript AI Agent Frameworks 2026](https://techwithibrahim.medium.com/top-5-typescript-ai-agent-frameworks-you-should-know-in-2026-5a2a0710f4a0) | 文章 | 15min | 框架对比 |
| [Vercel AI SDK Agents Guide](https://www.dplooy.com/blog/vercel-ai-sdk-agents-complete-2026-implementation-guide) | 文章 | 30min | Agent实战 |
| [LangChain.js 实战指南](https://medium.com/@prospectai/building-ai-agents-with-langchain-js-a-practical-guide-f8a1239989b3) | 文章 | 20min | LangChain补充 |

### 🔧 工具推荐

| 工具 | 用途 | 说明 |
|------|------|------|
| **Cursor / Claude Code** | AI辅助编程 | 你正在用的，继续 |
| **Postman/Thunder Client** | API调试 | 测试LLM调用 |
| **Vercel** | 部署 | 一键部署Next.js应用 |
| **Supabase** | 向量数据库 | 免费额度够用 |
| **Ollama** | 本地模型 | 用3090跑本地LLM（进阶） |

---

## 七、验收标准

学完之后，你能够：

- [ ] **基础能力**：独立搭建一个AI聊天应用，支持流式输出
- [ ] **工具调用**：实现Function Calling，让Agent能调用外部API
- [ ] **RAG系统**：搭建文档检索+问答系统
- [ ] **记忆管理**：实现长期/短期记忆，多轮对话
- [ ] **完整项目**：独立完成至少一个实战项目（建议：智能爬虫或知识库）

### 代码验收示例

```typescript
// 你应该能看懂并写出这样的代码：
import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const result = await generateText({
  model: openai('gpt-4o'),
  tools: {
    getWeather: tool({
      description: '获取天气',
      parameters: z.object({ city: z.string() }),
      execute: async ({ city }) => {
        // 调用天气API
        return weatherData;
      },
    }),
  },
  prompt: '上海今天天气怎么样？',
});

console.log(result.toolCalls); // LLM决定调用getWeather
console.log(result.text);      // 最终回答
```

---

## 八、下一步深入方向

### 短期（学完基础后）

| 方向 | 说明 | 与现有技能结合 |
|------|------|--------------|
| **LangGraph.js** | 复杂Agent编排 | 结合你的工作流/RPA经验 |
| **本地模型部署** | Ollama + LM Studio | 利用3090显卡 |
| **Agent测试/评估** | LangSmith / 评估框架 | 提升代码质量 |

### 长期（职业方向）

| 方向 | 35岁护城河 | 收入潜力 |
|------|-----------|---------|
| AI应用架构师 | 🔴 极高 | 50k-100k/月 |
| 垂直领域Agent专家 | 🟡 高 | 30k-80k/月 |
| AI全栈开发者 | 🟡 高 | 25k-60k/月 |
| Agent产品创始人 | 🔴 极高 | 上不封顶 |

---

## 九、学习计划时间表

### 第1-2周：阶段1（基础速通）
```
周目标：跑通第一个AI聊天应用

周一：LLM概念 + API申请
周二-周三：Vercel AI SDK入门
周四-周五：Prompt Engineering
周末：综合练习，搞定第一个聊天Demo
```

### 第3-5周：阶段2（核心技能）
```
周目标：掌握Function Calling + RAG

Week3: Function Calling + 天气Agent项目
Week4: RAG基础 + 向量数据库
Week5: 记忆系统 + 多Agent协作
```

### 第6-8周：阶段3（综合实战）
```
周目标：完成1-2个完整项目

Week6-7: 智能爬虫Agent（或创业项目增强）
Week8: 个人知识库Agent + 整理作品集
```

---

## 十、与创业项目结合建议

你当前负责：**前端 + 爬虫**

### Agent可以增强的方向：

| 当前模块 | Agent增强方案 | 预期效果 |
|---------|--------------|---------|
| 爬虫 | **智能爬虫Agent** - 自动分析页面、反爬应对 | 减少50%+人工配置 |
| 前端 | **智能问答Agent** - 用户自助服务 | 降低客服成本 |
| 文档解析 | **解析策略Agent** - 动态选择解析方案 | 提升准确率 |

### 行动建议：
1. **边学边贡献** - 每周学完一个知识点，就在创业项目中找场景应用
2. **小步快跑** - 先做Demo验证价值，再投入开发资源
3. **团队演示** - 学成后给团队分享，提升整体技术能力

---

**祝你学习顺利！有问题随时问。**

---

*路线图版本：v1.0 | 最后更新：2025-02-16*

---

## Sources

- [Top 5 TypeScript AI Agent Frameworks in 2026](https://techwithibrahim.medium.com/top-5-typescript-ai-agent-frameworks-you-should-know-in-2026-5a2a0710f4a0)
- [Vercel AI SDK Agents: Complete 2026 Implementation Guide](https://www.dplooy.com/blog/vercel-ai-sdk-agents-complete-2026-implementation-guide)
- [Building AI Agents with LangChain.js: A Practical Guide](https://medium.com/@prospectai/building-ai-agents-with-langchain-js-a-practical-guide-f8a1239989b3)
- [LangChain.js Documentation](https://docs.langchain.com/oss/javascript/langchain/overview)
