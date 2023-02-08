// 用于处理请求信息
import { HttpParser } from './http-parser.js';

class IncomingMessage {
  constructor(message) {
    this.httpParser = new HttpParser(message);
    this.httpMessage = this.httpParser.httpMessage;
  }
}

export default IncomingMessage;
