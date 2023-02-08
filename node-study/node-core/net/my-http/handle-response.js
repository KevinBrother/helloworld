// 用于响应处理结果
import * as net from 'net';
// ResponseFormatter 就是反序列化 JSON 数据的类，可从源码仓库查看
import ResponseFormatter from './response-formate.js';

class ServerResponse {
  constructor(socket) {
    this.socket = socket;
    this.resFormatter = new ResponseFormatter();
  }

  setHeader(key, val) {
    this.resFormatter.setHeader(key, val);
  }

  end(status, body) {
    const resFormatter = this.resFormatter;
    resFormatter.setStatus(status);
    resFormatter.setBody(body);
    // 下面三步就是向客户端发送 TCP 字节流数据
    this.socket.write(resFormatter.format());
    this.socket.pipe(this.socket);
    this.socket.end();
  }
}

export default ServerResponse;
