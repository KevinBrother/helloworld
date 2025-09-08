# 🚀 Crawlee 测试驱动学习 - 快速开始指南

## 📦 立即开始

```bash
# 1. 安装依赖
pnpm install

# 2. 运行环境测试 (验证设置)
pnpm test:setup

# 3. 运行基础功能测试
pnpm test:basic

# 4. 运行所有测试
pnpm test:all
```

## 🎯 核心命令

| 命令 | 功能 | 推荐使用场景 |
|------|------|------------|
| `pnpm test:setup` | 测试环境设置 | 初次运行，验证环境 |
| `pnpm test:basic` | 基础爬虫功能 | 学习核心API |
| `pnpm test` | 交互式测试 | 开发调试时 |
| `pnpm test:run [文件]` | 运行特定测试 | 针对性学习 |
| `pnpm test:coverage` | 生成覆盖率报告 | 查看学习进度 |

## 📚 学习路径

### 🔰 初学者 (第1天)
```bash
# 了解环境和基础API
pnpm test:setup
pnpm test:basic
```
**学习内容**: PlaywrightCrawler 基础用法、Dataset 数据存储

### 🎓 进阶者 (第2-3天)
```bash
# 浏览器自动化
pnpm test:run tests/unit/browser-automation.test.ts

# 性能优化
pnpm test:run tests/unit/performance-optimization.test.ts
```
**学习内容**: 表单处理、截图、并发控制、重试机制

### 🚀 高级用户 (第4-5天)
```bash
# 去重和缓存
pnpm test:run tests/unit/deduplication-caching.test.ts

# 完整流程
pnpm test:run tests/integration/full-crawl-flow.test.ts
```
**学习内容**: URL去重、内容缓存、完整爬取流程

## 🎪 测试结果示例

成功运行后你会看到：
```
🎯 Crawlee 测试驱动学习项目
=====================================

✅ 通过 🔧 测试环境设置
✅ 通过 🚀 基础爬虫功能

🎉 所有测试都通过了！你已经掌握了 Crawlee 的核心功能！
```

## 🔧 故障排除

### 常见问题

**Q: 测试运行缓慢**
```bash
# 减少并发数
pnpm test:run tests/unit/basic-crawler.test.ts
```

**Q: 内存不足**
```bash
# 单个文件运行
pnpm test:run tests/setup.test.ts
```

**Q: 想看详细日志**
```bash
DEBUG=crawlee:* pnpm test:basic
```

### 依赖问题
```bash
# 重新安装依赖
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## 📖 文件结构速览

```
crawlee-test/
├── tests/
│   ├── unit/                    # 🧪 单元测试
│   │   ├── basic-crawler.test.ts       # ✅ 核心API测试
│   │   ├── browser-automation.test.ts  # 🌐 浏览器控制
│   │   ├── performance-optimization.test.ts # ⚡ 性能优化
│   │   └── deduplication-caching.test.ts   # 🔄 去重缓存
│   ├── integration/             # 🔗 集成测试
│   │   └── full-crawl-flow.test.ts    # 完整流程测试
│   └── helpers/                 # 🛠️ 测试工具
│       ├── mock-server.ts       # Mock HTTP服务器
│       └── test-utils.ts        # 测试辅助函数
├── FEATURE_CHECKLIST.md        # 📋 功能清单(80+代码示例)
├── README_TESTS.md              # 📖 详细使用说明
└── PROJECT_SUMMARY.md           # 📊 项目总结报告
```

## 🎨 自定义学习

想测试特定功能？创建你的测试：

```typescript
// tests/my-test.test.ts
import { describe, it, expect } from 'vitest';
import { PlaywrightCrawler } from 'crawlee';
import { withMockServer } from './helpers/test-utils.js';

describe('我的自定义学习', () => {
  it('应该学会XXX功能', async () => {
    await withMockServer(async (helper) => {
      const crawler = new PlaywrightCrawler({
        requestHandler: async ({ page, request }) => {
          // 你的学习代码
        }
      });
      
      await crawler.run([helper.getServerUrl()]);
      // 验证学习效果
    });
  });
});
```

然后运行：
```bash
pnpm test:run tests/my-test.test.ts
```

## 🎯 学习目标检查清单

- [ ] ✅ 环境设置正常 (`pnpm test:setup`)
- [ ] 🚀 掌握基础API (`pnpm test:basic`)
- [ ] 🌐 学会浏览器控制
- [ ] ⚡ 理解性能优化
- [ ] 🔄 掌握去重缓存
- [ ] 🔗 完成完整流程

## 🎉 下一步

完成所有测试后，你可以：

1. **查看详细报告**: 阅读 `PROJECT_SUMMARY.md`
2. **深入学习**: 研究 `FEATURE_CHECKLIST.md` 中的80+代码示例
3. **实际应用**: 根据测试案例编写真实的爬虫项目
4. **分享经验**: 这个项目本身就是很好的学习资源！

---

**🎯 目标**: 通过测试驱动的方式，让你在不写实际爬虫代码的情况下，完全掌握 Crawlee 框架的核心功能！

开始你的 Crawlee 学习之旅吧！ 🚀