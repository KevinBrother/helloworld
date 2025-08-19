import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('基础功能测试', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('getHello', () => {
    it('应该返回欢迎消息', () => {
      const result = controller.getHello();
      
      expect(result).toBe('Web Crawler API is running!');
      expect(typeof result).toBe('string');
    });
  });

  describe('getHealth', () => {
    it('应该返回健康状态信息', () => {
      const result = controller.getHealth();
      
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result.status).toBe('ok');
      expect(typeof result.timestamp).toBe('string');
    });

    it('应该返回有效的ISO时间戳', () => {
      const result = controller.getHealth();
      const timestamp = new Date(result.timestamp);
      
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    it('应该返回当前时间附近的时间戳', () => {
      const beforeCall = new Date();
      const result = controller.getHealth();
      const afterCall = new Date();
      const resultTime = new Date(result.timestamp);
      
      expect(resultTime.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(resultTime.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });
  });

  describe('getInfo', () => {
    it('应该返回应用信息', () => {
      const result = controller.getInfo();
      
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('description');
      expect(result.name).toBe('Web Crawler API');
      expect(result.version).toBe('2.0.0');
      expect(result.description).toBe('A powerful web crawler service with improved architecture');
    });

    it('应该返回字符串类型的属性', () => {
      const result = controller.getInfo();
      
      expect(typeof result.name).toBe('string');
      expect(typeof result.version).toBe('string');
      expect(typeof result.description).toBe('string');
    });

    it('应该返回非空的属性值', () => {
      const result = controller.getInfo();
      
      expect(result.name).toBeTruthy();
      expect(result.version).toBeTruthy();
      expect(result.description).toBeTruthy();
      expect(result.name.length).toBeGreaterThan(0);
      expect(result.version.length).toBeGreaterThan(0);
      expect(result.description.length).toBeGreaterThan(0);
    });

    it('应该返回符合语义化版本格式的版本号', () => {
      const result = controller.getInfo();
      const versionRegex = /^\d+\.\d+\.\d+$/;
      
      expect(result.version).toMatch(versionRegex);
    });
  });

  describe('API响应一致性测试', () => {
    it('多次调用getHello应该返回相同结果', () => {
      const result1 = controller.getHello();
      const result2 = controller.getHello();
      
      expect(result1).toBe(result2);
    });

    it('多次调用getInfo应该返回相同结果', () => {
      const result1 = controller.getInfo();
      const result2 = controller.getInfo();
      
      expect(result1).toEqual(result2);
    });

    it('getHealth的status应该始终为ok', () => {
      for (let i = 0; i < 5; i++) {
        const result = controller.getHealth();
        expect(result.status).toBe('ok');
      }
    });
  });

  describe('边界情况和错误处理', () => {
    it('控制器方法应该不抛出异常', () => {
      expect(() => controller.getHello()).not.toThrow();
      expect(() => controller.getHealth()).not.toThrow();
      expect(() => controller.getInfo()).not.toThrow();
    });

    it('返回的对象应该是可序列化的', () => {
      const healthResult = controller.getHealth();
      const infoResult = controller.getInfo();
      
      expect(() => JSON.stringify(healthResult)).not.toThrow();
      expect(() => JSON.stringify(infoResult)).not.toThrow();
      
      const healthJson = JSON.stringify(healthResult);
      const infoJson = JSON.stringify(infoResult);
      
      expect(() => JSON.parse(healthJson)).not.toThrow();
      expect(() => JSON.parse(infoJson)).not.toThrow();
    });

    it('解析后的JSON应该与原对象相等', () => {
      const healthResult = controller.getHealth();
      const infoResult = controller.getInfo();
      
      const healthParsed = JSON.parse(JSON.stringify(healthResult));
      const infoParsed = JSON.parse(JSON.stringify(infoResult));
      
      expect(healthParsed).toEqual(healthResult);
      expect(infoParsed).toEqual(infoResult);
    });
  });
});