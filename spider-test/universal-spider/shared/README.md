# Universal Spider Shared Types

这是 Universal Spider 项目的共享类型定义包，用于在前端和后端之间共享 TypeScript 类型定义。

## 功能特性

- 🔄 **自动类型生成**: 从 Swagger 文档自动生成 TypeScript 类型定义
- 📦 **统一类型管理**: 前后端共享相同的类型定义，确保类型一致性
- 🛠️ **开发友好**: 支持热更新和自动构建
- 📚 **完整文档**: 包含详细的类型注释和使用说明

## 安装和使用

### 在项目中安装

```bash
# 在 frontend 或 backend 项目中
npm install file:../shared
```

### 导入类型

```typescript
// 导入所有类型
import * from '@universal-spider/shared';

// 导入特定类型
import { LoginDto, CreateTaskDto, User } from '@universal-spider/shared';

// 使用类型别名
import { UserType, ResponseType } from '@universal-spider/shared';
```

## 类型分类

### 1. 用户相关类型 (`user.types.ts`)
- `User`: 用户基础信息
- `CreateUserRequest`: 创建用户请求
- `LoginRequest`: 登录请求
- `LoginResponse`: 登录响应

### 2. 任务相关类型 (`task.types.ts`)
- `Task`: 任务基础信息
- `CreateTaskRequest`: 创建任务请求
- `UpdateTaskRequest`: 更新任务请求
- `TaskStats`: 任务统计信息

### 3. 配置相关类型 (`config.types.ts`)
- `CrawlConfig`: 爬虫配置
- `CreateConfigRequest`: 创建配置请求
- `UpdateConfigRequest`: 更新配置请求

### 4. 监控相关类型 (`monitoring.types.ts`)
- `SystemStats`: 系统统计信息
- `PerformanceMetrics`: 性能指标

### 5. 通用类型 (`common.types.ts`)
- `ApiResponse<T>`: 通用 API 响应格式
- `PaginatedResponse<T>`: 分页响应格式
- `ErrorResponse`: 错误响应格式

### 6. 自动生成的 API 类型 (`generated-api.types.ts`)
从 Swagger 文档自动生成的完整 DTO 类型定义，包括：
- 所有控制器的请求/响应类型
- 数据验证规则
- API 文档注释

## 开发工作流

### 1. 更新后端 API
当你在后端添加或修改 API 时：

```bash
# 1. 确保后端服务正在运行
cd backend
npm run start:dev

# 2. 重新生成类型定义
cd ../scripts
node generate-types.js

# 3. 重新构建 shared 包
cd ../shared
npm run build
```

### 2. 在前端使用新类型
```typescript
// 前端会自动获得最新的类型定义
import { NewApiDto } from '@universal-spider/shared';

const handleSubmit = async (data: NewApiDto) => {
  // TypeScript 会提供完整的类型检查和自动补全
};
```

### 3. 在后端验证类型一致性
```typescript
// 后端可以使用相同的类型进行验证
import { CreateTaskDto } from '@universal-spider/shared';

@Post()
async create(@Body() createTaskDto: CreateTaskDto) {
  // 类型安全的 API 实现
}
```

## 自动化脚本

### 类型生成脚本 (`scripts/generate-types.js`)
- 从运行中的后端服务获取 Swagger 文档
- 解析 API 定义并生成 TypeScript 类型
- 自动更新 `shared/src/types/generated-api.types.ts`

### 使用方法
```bash
cd scripts
node generate-types.js
```

## 最佳实践

1. **保持类型同步**: 每次修改后端 API 后都要重新生成类型
2. **使用类型别名**: 为常用类型创建简短的别名
3. **避免手动修改生成的文件**: `generated-api.types.ts` 由脚本自动维护
4. **添加类型注释**: 在手动定义的类型中添加详细的注释
5. **版本控制**: 将生成的类型文件纳入版本控制

## 构建和发布

```bash
# 构建类型定义
npm run build

# 检查类型
npm run type-check
```

## 故障排除

### 常见问题

1. **类型生成失败**
   - 确保后端服务正在运行 (`http://localhost:3001`)
   - 检查 Swagger 文档是否可访问 (`http://localhost:3001/api/docs`)

2. **类型导入错误**
   - 重新安装 shared 包: `npm install file:../shared`
   - 重新构建 shared 包: `cd shared && npm run build`

3. **类型冲突**
   - 检查是否有重复的类型定义
   - 确保正确使用类型别名

## 贡献指南

1. 修改类型定义时，请同时更新相关文档
2. 确保新增的类型有适当的注释
3. 运行类型检查确保没有错误
4. 更新此 README 文件以反映变更