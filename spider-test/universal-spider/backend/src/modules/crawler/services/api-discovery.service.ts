import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright';

export interface DiscoveredApi {
  url: string;
  method: string;
  headers: Record<string, string>;
  params: Record<string, unknown>;
  response: Record<string, unknown>;
  timestamp: Date;
}

@Injectable()
export class ApiDiscoveryService {
  private readonly logger = new Logger(ApiDiscoveryService.name);
  private discoveredApis: Map<number, DiscoveredApi[]> = new Map();

  async discoverApis(taskId: number): Promise<{ apis: DiscoveredApi[] }> {
    const apis = this.discoveredApis.get(taskId) || [];
    return { apis };
  }

  async startApiDiscovery(page: Page, taskId: number): Promise<void> {
    this.logger.log(`开始API发现，任务ID: ${taskId}`);

    const discoveredApis: DiscoveredApi[] = [];

    // 监听网络请求
    page.on('request', (request) => {
      const url = request.url();
      const method = request.method();
      const headers = request.headers();

      // 过滤API请求
      if (this.isApiRequest(url, headers)) {
        this.logger.debug(`发现API请求: ${method} ${url}`);

        const apiInfo: Partial<DiscoveredApi> = {
          url,
          method,
          headers,
          params: this.extractParams(request),
          timestamp: new Date(),
        };

        // 等待响应
        request
          .response()
          .then((response) => {
            if (response) {
              response
                .json()
                .then((data) => {
                  apiInfo.response = data;
                  discoveredApis.push(apiInfo as DiscoveredApi);
                })
                .catch(() => {
                  // 如果不是JSON响应，记录文本内容
                  response
                    .text()
                    .then((text) => {
                      apiInfo.response = { data: text };
                      discoveredApis.push(apiInfo as DiscoveredApi);
                    })
                    .catch(() => {
                      apiInfo.response = undefined;
                      discoveredApis.push(apiInfo as DiscoveredApi);
                    });
                });
            }
          })
          .catch(() => {
            // 请求失败也记录
            apiInfo.response = undefined;
            discoveredApis.push(apiInfo as DiscoveredApi);
          });
      }
    });

    // 存储发现的API
    this.discoveredApis.set(taskId, discoveredApis);
  }

  private isApiRequest(url: string, headers: Record<string, string>): boolean {
    // 检查URL模式
    const apiPatterns = [
      /\/api\//,
      /\/v\d+\//,
      /\/rest\//,
      /\/graphql/,
      /\.json$/,
      /\/ajax\//,
    ];

    if (apiPatterns.some((pattern) => pattern.test(url))) {
      return true;
    }

    // 检查Content-Type
    const contentType =
      headers['content-type'] || headers['Content-Type'] || '';
    if (
      contentType.includes('application/json') ||
      contentType.includes('application/xml') ||
      contentType.includes('text/xml')
    ) {
      return true;
    }

    // 检查Accept头
    const accept = headers['accept'] || headers['Accept'] || '';
    if (
      accept.includes('application/json') ||
      accept.includes('application/xml')
    ) {
      return true;
    }

    return false;
  }

  private extractParams(request: any): Record<string, any> {
    const params: Record<string, any> = {};

    try {
      // 提取URL参数
      const url = new URL(request.url());
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      // 提取POST数据
      const postData = request.postData();
      if (postData) {
        try {
          const jsonData = JSON.parse(postData);
          Object.assign(params, jsonData);
        } catch {
          // 如果不是JSON，尝试解析表单数据
          const formData = new URLSearchParams(postData);
          formData.forEach((value, key) => {
            params[key] = value;
          });
        }
      }
    } catch (error) {
      this.logger.warn('提取请求参数失败', error);
    }

    return params;
  }

  async analyzeApiPatterns(taskId: number): Promise<{
    patterns: string[];
    endpoints: string[];
    authentication: string[];
  }> {
    const apis = this.discoveredApis.get(taskId) || [];

    const patterns = new Set<string>();
    const endpoints = new Set<string>();
    const authentication = new Set<string>();

    apis.forEach((api) => {
      // 分析URL模式
      const urlPattern = this.extractUrlPattern(api.url);
      patterns.add(urlPattern);

      // 收集端点
      endpoints.add(api.url);

      // 分析认证方式
      const authType = this.detectAuthenticationType(api.headers);
      if (authType) {
        authentication.add(authType);
      }
    });

    return {
      patterns: Array.from(patterns),
      endpoints: Array.from(endpoints),
      authentication: Array.from(authentication),
    };
  }

  private extractUrlPattern(url: string): string {
    try {
      const urlObj = new URL(url);
      let pathname = urlObj.pathname;

      // 替换数字ID为占位符
      pathname = pathname.replace(/\/\d+/g, '/{id}');

      // 替换UUID为占位符
      pathname = pathname.replace(
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        '/{uuid}',
      );

      return `${urlObj.origin}${pathname}`;
    } catch {
      return url;
    }
  }

  private detectAuthenticationType(
    headers: Record<string, string>,
  ): string | null {
    const authHeader = headers['authorization'] || headers['Authorization'];

    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        return 'Bearer Token';
      }
      if (authHeader.startsWith('Basic ')) {
        return 'Basic Auth';
      }
      if (authHeader.startsWith('Digest ')) {
        return 'Digest Auth';
      }
    }

    // 检查API Key
    const apiKeyHeaders = ['x-api-key', 'api-key', 'apikey'];
    for (const header of apiKeyHeaders) {
      if (headers[header] || headers[header.toUpperCase()]) {
        return 'API Key';
      }
    }

    // 检查Cookie认证
    if (headers['cookie'] || headers['Cookie']) {
      return 'Cookie Auth';
    }

    return null;
  }

  clearDiscoveredApis(taskId: number): void {
    this.discoveredApis.delete(taskId);
    this.logger.log(`清除任务 ${taskId} 的API发现数据`);
  }

  getAllDiscoveredApis(): Map<number, DiscoveredApi[]> {
    return this.discoveredApis;
  }
}
