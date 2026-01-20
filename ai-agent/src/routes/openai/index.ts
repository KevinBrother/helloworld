import { FastifyPluginAsync } from 'fastify';
import OpenAI from 'openai';

const openaiRoute: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post('/chat', async function (request, reply) {
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

  fastify.post('/chat/stream', async function (request, reply) {
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
