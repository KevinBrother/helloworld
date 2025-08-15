import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('AppConfig', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.resetModules(); // Reset modules before each test
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  async function loadConfig() {
    // Use dynamic import to re-evaluate the module
    return await import('./app.config?' + Date.now());
  }

  describe('defaultAppConfig', () => {
    it('should have correct default values', async () => {
      const { defaultAppConfig } = await loadConfig();
      expect(defaultAppConfig.port).toBe(3000);
      // When running tests, NODE_ENV is typically 'test'
      expect(defaultAppConfig.environment).toBe('test');
      expect(defaultAppConfig.cors.enabled).toBe(false);
      expect(defaultAppConfig.cors.origins).toEqual(['*']);
      expect(defaultAppConfig.logging.level).toBe('info');
      expect(defaultAppConfig.logging.format).toBe('simple');
    });

    it('should read PORT from environment variables', async () => {
      process.env.PORT = '8080';
      const { defaultAppConfig: newConfig } = await loadConfig();
      expect(newConfig.port).toBe(8080);
    });

    it('should read NODE_ENV from environment variables', async () => {
      process.env.NODE_ENV = 'production';
      const { defaultAppConfig: newConfig } = await loadConfig();
      expect(newConfig.environment).toBe('production');
    });
  });

  describe('defaultCrawlerConfig', () => {
    it('should have correct default values', async () => {
        const { defaultCrawlerConfig } = await loadConfig();
        expect(defaultCrawlerConfig.browser.headless).toBe(true);
        expect(defaultCrawlerConfig.crawler.maxDepth).toBe(6);
    });

    it('should read CRAWLER_MAX_DEPTH from environment variables', async () => {
        process.env.CRAWLER_MAX_DEPTH = '3';
        const { defaultCrawlerConfig: newConfig } = await loadConfig();
        expect(newConfig.crawler.maxDepth).toBe(3);
    });
  });

  describe('defaultStorageConfig', () => {
    it('should have correct default values', async () => {
      const { defaultStorageConfig } = await loadConfig();
      expect(defaultStorageConfig.minio.endpoint).toBe('localhost');
      expect(defaultStorageConfig.minio.port).toBe(9000);
      expect(defaultStorageConfig.minio.accessKey).toBe('minioadmin');
      expect(defaultStorageConfig.minio.secretKey).toBe('minioadmin');
    });

    it('should read MINIO_ENDPOINT from environment variables', async () => {
        process.env.MINIO_ENDPOINT = 'minio.example.com';
        const { defaultStorageConfig: newConfig } = await loadConfig();
        expect(newConfig.minio.endpoint).toBe('minio.example.com');
    });
  });
});
