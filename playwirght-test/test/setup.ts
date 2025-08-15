import { vi } from 'vitest';

// 全局 Mock 设置
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        on: vi.fn(),
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn(),
          content: vi.fn().mockResolvedValue('<html><body>Test</body></html>'),
          title: vi.fn().mockResolvedValue('Test Page'),
          screenshot: vi.fn().mockResolvedValue(Buffer.from('test')),
          close: vi.fn(),
        }),
        close: vi.fn(),
      }),
      close: vi.fn(),
    }),
  },
}));

vi.mock('minio', () => ({
  Client: vi.fn(),
}));

// 环境变量设置
process.env.NODE_ENV = 'test';