import { FastifyPluginAsync } from 'fastify';

const openaiRoute: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post('/chat', {
    schema: {
      tags: ['openai'],
      summary: 'OpenAI 聊天接口',
      description: '发送消息到 OpenAI 兼容的 API 并获取响应',
      body: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string', description: '用户消息内容' },
          model: { type: 'string', description: '模型名称，默认使用配置中的默认模型' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'AI 响应内容' },
            usage: {
              type: 'object',
              properties: {
                prompt_tokens: { type: 'number' },
                completion_tokens: { type: 'number' },
                total_tokens: { type: 'number' },
              },
            },
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
          },
        },
      },
    },
  }, async function (request, reply) {
    const { message, model } = request.body as {
      message?: string;
      model?: string;
    };

    const selectedModel = model || fastify.openaiConfig.defaultModel;

    if (!message) {
      return reply.status(400).send({ error: 'Message is required' });
    }

    try {
      const completion = await fastify.openai.chat.completions.create({
        model: selectedModel,
        messages: [{ role: 'user', content: message }],
      });

      return {
        content: completion.choices[0]?.message?.content || '',
        usage: completion.usage,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to process request' });
    }
  });

  fastify.post('/chat/stream', {
    schema: {
      tags: ['openai'],
      summary: 'OpenAI 流式聊天接口',
      description: '发送消息到 OpenAI API 并以 SSE (Server-Sent Events) 流式接收响应',
      body: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string', description: '用户消息内容' },
          model: { type: 'string', description: '模型名称' },
        },
      },
      response: {
        200: {
          description: 'SSE 流式响应',
          content: {
            'text/event-stream': {
              schema: {
                type: 'string',
                format: 'binary',
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async function (request, reply) {
    const { message, model } = request.body as {
      message?: string;
      model?: string;
    };

    const selectedModel = model || fastify.openaiConfig.defaultModel;

    if (!message) {
      return reply.status(400).send({ error: 'Message is required' });
    }

    // Set SSE headers
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');

    try {
      const stream = await fastify.openai.chat.completions.create({
        model: selectedModel,
        messages: [{ role: 'user', content: message }],
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          reply.raw.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Send done signal
      reply.raw.write('data: [DONE]\n\n');
      reply.raw.end();
    } catch (error) {
      fastify.log.error(error);
      reply.raw.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
      reply.raw.end();
    }
  });
};

export default openaiRoute;
