# 微信JS-SKD使用

## 查看demo

### 根目录安装静态服务器

- `npm i -g anywhere`
- `anywhere`
- 浏览器打开anywhere启动的服务

### 进入server,启动微信后端服务

- `npm i`
- `npm start`

## 修改微信公众号的配置

- appId、appSecret 在wx-config/server/src/weChatConfig.js文件中

## 微信开发文档

### 后端

- [接入指南](https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/Access_Overview.html)

  - 需要自己实现接口，让微信调用，确认服务器可用

- [获取access-token](https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/Get_access_token.html)

### 前端

- [JS-SDK](https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/JS-SDK.html#0)
