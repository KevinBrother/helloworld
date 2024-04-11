import { execSync } from "child_process";

import http from "http";

export class Proxy {
  proxyHost: string = "";
  proxyPort: number = 0;

  constructor(host = "127.0.0.1", port = 7890) {
    this.proxyHost = host;
    this.proxyPort = port;
  }

  /**
   * 获取 http 系统代理配置（macOS）
   * @returns string
   */
  getMacProxy() {
    const command = "networksetup -getwebproxy Wi-Fi";
    const httpProxy = execSync(command).toString();

    const httpsCommand = "networksetup -getsecurewebproxy Wi-Fi";
    const httpsProxy = execSync(httpsCommand).toString();

    const socksCommand = "networksetup -getsocksfirewallproxy Wi-Fi";
    const socksProxy = execSync(socksCommand).toString();

    return {
      httpProxy,
      httpsProxy,
      socksProxy,
    };
  }

  /**
   * 设置 http 系统代理配置（macOS）
   * @param host ip
   * @param port
   */
  addMacProxy(host = "127.0.0.1", port = 18080) {
    // 设置 HTTP 代理
    const command = `networksetup -setwebproxy Wi-Fi ${host} ${port}`;
    execSync(command);

    // 设置 HTTPS 代理
    const httpsCommand = `networksetup -setsecurewebproxy Wi-Fi ${host} ${port}`;
    execSync(httpsCommand);

    // 设置 SOCKS 代理
    const socksCommand = `networksetup -setsocksfirewallproxy Wi-Fi ${host} ${port}`;
    execSync(socksCommand);

    this.proxyHost = host;
    this.proxyPort = port;
  }

  //   sendRequest(url: string) {
  //     http.Agent
  //     const agent = new ProxyAgent("http://127.0.0.1:18080");
  // http://example.com
  // https://example.com

  //   }

  sendRequest(hostname = "example.com", host?: string, port?: number) {
    const proxyHost = host || this.proxyHost;
    const proxyPort = port || this.proxyPort;

    // 创建代理对象
    const proxyOptions = {
      host: proxyHost,
      port: proxyPort,
    };
    console.log("🚀 ~ Proxy ~ sendRequest ~ proxyOptions:", proxyOptions)

    // 发起 HTTP 请求
    const options: http.RequestOptions = {
      hostname,
      port: 80,
      method: 'GET',
      agent: new http.Agent(proxyOptions)
    };

    const req = http.request(options, (res) => {
      console.log(`STATUS: ${res.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        console.log(`BODY: ${chunk}`);
      });
      res.on("end", () => {
        console.log("No more data in response.");
      });
    });

    req.on("error", (e) => {
      console.error(`problem with request: ${e.message}`);
    });

    // 发送请求
    req.end();
  }
}

const proxy = new Proxy();

// proxy.addMacProxy("127.0.0.1", 7890);
console.log("proxy.getMacProxy()", proxy.getMacProxy());
proxy.sendRequest();
