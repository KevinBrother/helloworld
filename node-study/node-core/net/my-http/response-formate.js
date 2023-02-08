class ResponseFormatter {
  status = 200;
  message = 'ok';
  version = 'HTTP/1.1';
  headers;
  body = '';

  constructor() {
    this.headers = {
      'Content-Type': 'text/plain'
    };
  }

  setStatus(status) {
    this.status = status;
  }

  setBody(body) {
    this.body = body;
  }

  setHeader(key, val) {
    this.headers[key] = val;
  }

  format() {
    const head = `${this.version} ${this.status} ${this.message}`;
    let headers = '';
    for (let key in this.headers) {
      const value = this.headers[key];
      headers += `${key.toLocaleLowerCase()}: ${value}\r\n`;
    }
    const combineData = [head, headers, this.body].join('\r\n');
    return combineData;
  }
}

export default ResponseFormatter;
