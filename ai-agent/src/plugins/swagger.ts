import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

/**
 * Swagger 插件配置
 * 用于生成 API 文档和提供可交互的 Swagger UI
 */
export default fp(async (fastify) => {
  // 注册 Swagger 核心
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'AI Agent API',
        description: `
AI Agent 服务 API 文档

## 功能特性

- **OpenAI 集成**: 直接调用 OpenAI 兼容的 API
- **LangChain 集成**: 使用 LangChain 进行链式调用、Agent 工具调用、对话记忆管理
- **流式响应**: 支持 SSE 流式输出

## 环境变量

在使用 API 前，请确保在 \`.env\` 文件中配置以下变量：

\`\`\`bash
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_DEFAULT_MODEL=gpt-4
\`\`\`

## 快速开始

1. 选择任一 API 端点
2. 点击 "Try it out"
3. 填写请求参数
4. 点击 "Execute" 执行请求
        `,
        version: '1.0.0',
        contact: {
          name: 'API Support',
          email: 'support@example.com',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: '本地开发服务器',
        },
        {
          url: 'http://localhost:3001',
          description: '备用本地端口',
        },
      ],
      tags: [
        { name: 'root', description: '根路径和健康检查' },
        { name: 'openai', description: 'OpenAI API 集成' },
        { name: 'langchain', description: 'LangChain 集成' },
        { name: 'example', description: '示例路由' },
      ],
      components: {
        schemas: {
          ErrorResponse: {
            type: 'object',
            properties: {
              error: { type: 'string', description: '错误信息' },
              details: { type: 'string', description: '详细错误信息' },
            },
          },
          SuccessResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
            },
          },
        },
      },
    },
  });

  // 注册 Swagger UI
  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list', // 默认展开所有操作
      deepLinking: true,
      persistAuthorization: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecificationClone: true,
  });
});
