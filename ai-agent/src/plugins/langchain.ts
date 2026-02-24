import fp from 'fastify-plugin';
import { ChatOpenAI } from '@langchain/openai';

export interface LangChainConfig {
  temperature?: number;
  verbose?: boolean;
}

declare module 'fastify' {
  interface FastifyInstance {
    llm: ChatOpenAI;
    langchainConfig: LangChainConfig;
  }
}

export default fp(async (fastify) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/coding/paas/v4';
  const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'glm-5';
  const temperature = parseFloat(process.env.LANGCHAIN_TEMPERATURE || '0.7');
  const verbose = process.env.LANGCHAIN_VERBOSE === 'true';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const llm = new ChatOpenAI({
    openAIApiKey: apiKey,
    configuration: {
      baseURL: baseURL,
    },
    modelName: defaultModel,
    temperature: temperature,
    verbose: verbose,
  });

  const langchainConfig: LangChainConfig = {
    temperature,
    verbose,
  };

  fastify.decorate('llm', llm);
  fastify.decorate('langchainConfig', langchainConfig);
}, {
  name: 'langchain'
});
