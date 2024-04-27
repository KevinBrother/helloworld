import http from 'http';
import { ProxyAgent } from 'proxy-agent';

// 获取系统代理配置

const proxyAgent = new ProxyAgent();
const proxy = proxyAgent.getProxyForUrl('http://example.com');

// 创建 HTTP 请求选项
const options = {
  host: 'example.com',
  path: '/',
};

// 发起 HTTP 请求
const request = http.request(options, response => {
  // 处理响应
  response.on('data', data => {
    console.log(data.toString());
  });
});

// 发送请求
request.end();