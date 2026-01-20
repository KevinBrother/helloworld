import fp from 'fastify-plugin';
import OpenAI from 'openai';

export interface OpenAIConfig {
  defaultModel: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    openai: OpenAI;
    openaiConfig: OpenAIConfig;
  }
}

export default fp(async (fastify) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const openai = new OpenAI({
    apiKey,
    ...(baseURL && { baseURL }),
  });

  const openaiConfig: OpenAIConfig = {
    defaultModel,
  };

  fastify.decorate('openai', openai);
  fastify.decorate('openaiConfig', openaiConfig);
}, {
  name: 'openai'
});
