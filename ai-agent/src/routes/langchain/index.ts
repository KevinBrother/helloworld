import { FastifyPluginAsync } from 'fastify';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { DynamicTool } from '@langchain/core/tools';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';

// In-memory store for conversation sessions
const conversationStore = new Map<string, BaseMessage[]>();

const langchainRoute: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // Health check endpoint
  fastify.get('/', {
    schema: {
      tags: ['langchain'],
      summary: 'LangChain 服务信息',
      description: '获取 LangChain 集成的可用端点和配置信息',
      response: {
        200: {
          type: 'object',
          properties: {
            service: { type: 'string' },
            version: { type: 'string' },
            model: { type: 'string' },
            endpoints: { type: 'object' },
            documentation: { type: 'string' },
          },
        },
      },
    },
  }, async function (request, reply) {
    return {
      service: 'LangChain Integration',
      version: '1.0.0',
      model: process.env.OPENAI_DEFAULT_MODEL || 'glm-5',
      endpoints: {
        simpleChain: '/langchain/simple',
        sequentialChain: '/langchain/sequential',
        agentCalculator: '/langchain/agents/calculate',
        agent: '/langchain/agents',
        conversation: '/langchain/memory',
        conversationHistory: '/langchain/memory/history/:sessionId',
      },
      documentation: 'https://github.com/langchain-ai/langchainjs',
    };
  });

  // ===== Simple Chain Endpoints =====
  fastify.post('/simple', {
    schema: {
      tags: ['langchain'],
      summary: '简单链式调用',
      description: '使用 LangChain 的简单链进行文本生成，支持自定义风格和语言',
      body: {
        type: 'object',
        required: ['topic'],
        properties: {
          topic: { type: 'string', description: '文章主题' },
          style: { type: 'string', description: '写作风格', default: 'professional' },
          language: { type: 'string', description: '输出语言', default: 'Chinese' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            input: { type: 'object' },
            output: { type: 'string' },
            chainType: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'string' },
          },
        },
      },
    },
  }, async function (request, reply) {
    const { topic, style = 'professional', language = 'Chinese' } = request.body as {
      topic?: string;
      style?: string;
      language?: string;
    };

    if (!topic) {
      return reply.status(400).send({ error: 'Topic is required' });
    }

    try {
      const prompt = ChatPromptTemplate.fromMessages([
        ['system', '你是一个专业的文章写作助手。'],
        ['user', '请以{style}的风格，用{language}写一篇关于"{topic}"的短文（100-200字）。'],
      ]);

      const chain = prompt.pipe(fastify.llm);
      const result = await chain.invoke({ topic, style, language });

      return {
        success: true,
        input: { topic, style, language },
        output: result.content as string,
        chainType: 'Simple Chain',
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Failed to execute chain',
        details: error.message,
      });
    }
  });

  // ===== Sequential Chain Endpoints =====
  fastify.post('/sequential', async function (request, reply) {
    const { product } = request.body as { product?: string };

    if (!product) {
      return reply.status(400).send({ error: 'Product is required' });
    }

    try {
      const reviewPrompt = ChatPromptTemplate.fromMessages([
        ['system', '你是一个产品评论专家。'],
        ['user', '请为"{product}"写一段简短的评论（50-100字）。'],
      ]);
      const reviewChain = reviewPrompt.pipe(fastify.llm).pipe(new StringOutputParser());

      const pointsPrompt = ChatPromptTemplate.fromMessages([
        ['system', '你是一个信息提取专家。'],
        ['user', '基于以下产品评论，提取3个关键点：\n{review}\n\n请以列表形式输出。'],
      ]);
      const pointsChain = pointsPrompt.pipe(fastify.llm).pipe(new StringOutputParser());

      const summaryPrompt = ChatPromptTemplate.fromMessages([
        ['system', '你是一个总结专家。'],
        ['user', '基于关键点：\n{points}\n\n请用一句话总结这个产品的核心价值。'],
      ]);
      const summaryChain = summaryPrompt.pipe(fastify.llm).pipe(new StringOutputParser());

      const review = await reviewChain.invoke({ product });
      const points = await pointsChain.invoke({ review });
      const summary = await summaryChain.invoke({ points });

      return {
        success: true,
        input: { product },
        steps: { review, points, summary },
        chainType: 'Sequential Chain',
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Failed to execute sequential chain',
        details: error.message,
      });
    }
  });

  // ===== Agent Endpoints =====
  const calculatorTool = new DynamicTool({
    name: 'calculator',
    description: '用于执行数学计算。输入应该是一个数学表达式，例如 "2 + 2" 或 "10 * 5"',
    func: async (input: string) => {
      try {
        const sanitized = input.replace(/[^0-9+\-*/().\s]/g, '');
        const result = Function(`"use strict"; return (${sanitized})`)();
        return String(result);
      } catch (error: any) {
        return `计算错误: ${error.message}`;
      }
    },
  });

  fastify.post('/agents/calculate', async function (request, reply) {
    const { expression } = request.body as { expression?: string };

    if (!expression) {
      return reply.status(400).send({ error: 'Expression is required' });
    }

    try {
      const result = await calculatorTool.invoke(expression);
      return {
        success: true,
        input: { expression },
        output: result,
        tool: 'Calculator',
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Calculation failed',
        details: error.message,
      });
    }
  });

  fastify.post('/agents', async function (request, reply) {
    const { query } = request.body as { query?: string };

    if (!query) {
      return reply.status(400).send({ error: 'Query is required' });
    }

    try {
      const hasNumbers = /\d+/.test(query);
      const hasMathOperators = /[+\-*/]/.test(query);

      if (hasNumbers && hasMathOperators) {
        const mathMatch = query.match(/[\d\s+\-*/().]+/g);
        if (mathMatch) {
          const expression = mathMatch[0].trim();
          const result = await calculatorTool.invoke(expression);

          return {
            success: true,
            input: { query },
            output: `计算结果：${expression} = ${result}`,
            toolUsed: 'calculator',
            agentType: 'Simple Tool Agent',
          };
        }
      }

      const prompt = ChatPromptTemplate.fromMessages([
        ['system', '你是一个有帮助的AI助手。'],
        ['human', '{input}'],
      ]);

      const chain = prompt.pipe(fastify.llm);
      const response = await chain.invoke({ input: query });

      return {
        success: true,
        input: { query },
        output: response.content as string,
        toolUsed: 'llm',
        agentType: 'Simple Tool Agent',
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Failed to execute agent',
        details: error.message,
      });
    }
  });

  // ===== Conversation Memory Endpoints =====
  fastify.post('/memory', async function (request, reply) {
    const { sessionId, message, windowSize = 10 } = request.body as {
      sessionId?: string;
      message?: string;
      windowSize?: number;
    };

    if (!sessionId || !message) {
      return reply.status(400).send({
        error: 'sessionId and message are required',
      });
    }

    try {
      let history = conversationStore.get(sessionId) || [];

      const prompt = ChatPromptTemplate.fromMessages([
        ['system', '你是一个友好的AI助手。请根据对话历史和当前消息，提供有帮助的回答。'],
        ...history.slice(-windowSize * 2),
        ['human', '{input}'],
      ]);

      const chain = prompt.pipe(fastify.llm);
      const response = await chain.invoke({ input: message });

      history.push(new HumanMessage(message));
      history.push(new AIMessage(response.content as string));

      if (history.length > windowSize * 2) {
        history = history.slice(-windowSize * 2);
      }

      conversationStore.set(sessionId, history);

      return {
        success: true,
        sessionId,
        input: message,
        response: response.content,
        memoryConfig: {
          windowSize,
          historyLength: history.length,
          type: 'Buffer Memory',
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Failed to process conversation',
        details: error.message,
      });
    }
  });

  fastify.get('/memory/history/:sessionId', async function (request, reply) {
    const { sessionId } = request.params as { sessionId: string };

    const history = conversationStore.get(sessionId);

    if (!history || history.length === 0) {
      return reply.status(404).send({
        error: 'Session not found or empty',
        sessionId,
      });
    }

    try {
      const formattedHistory = history.map(msg => ({
        role: msg instanceof HumanMessage ? 'user' : 'assistant',
        content: msg.content as string,
      }));

      return {
        success: true,
        sessionId,
        history: formattedHistory,
        message: 'Conversation history retrieved successfully',
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Failed to retrieve history',
        details: error.message,
      });
    }
  });

  fastify.delete('/memory/history/:sessionId', async function (request, reply) {
    const { sessionId } = request.params as { sessionId: string };

    const existed = conversationStore.has(sessionId);
    conversationStore.delete(sessionId);

    return {
      success: true,
      message: existed ? 'Conversation history cleared' : 'Session did not exist',
      sessionId,
    };
  });
};

export default langchainRoute;
