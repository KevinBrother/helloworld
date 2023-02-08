export class HttpParser {
  constructor(message) {
    this.message = message;
    this.parse();
  }

  parse() {
    this.httpMessage = {};
    const messages = this.message.split('\r\n');
    const [head] = messages;
    const headers = messages.slice(1, -2);
    const [body] = messages.slice(-1);
    this.parseHead(head);
    this.parseHeaders(headers);
    this.parseBody(body);
  }

  parseHead(headStr) {
    const [method, url, version] = headStr.split(' ');
    this.httpMessage.method = method;
    this.httpMessage.url = url;
    this.httpMessage.version = version;
  }

  parseHeaders(headerStrList) {
    this.httpMessage.headers = {};
    for (let i = 0; i < headerStrList.length; i++) {
      const header = headerStrList[i];
      let [key, value] = header.split(':');
      key = key.toLocaleLowerCase();
      value = value.trim();
      this.httpMessage.headers[key] = value;
    }
  }

  parseBody(bodyStr) {
    if (!bodyStr) return (this.httpMessage.body = '');
    this.httpMessage.body = bodyStr;
  }
}
