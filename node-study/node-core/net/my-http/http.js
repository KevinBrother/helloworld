import net from 'net';
import { EventEmitter } from 'events';
import IncomingMessage from './handle-request.js';
import ServerResponse from './handle-response.js';

class HTTP extends EventEmitter {
  constructor(handler) {
    super();
    this.handler = handler;
    this.createServer();
  }

  createServer() {
    this.server = net.createServer((socket) => {
      socket.on('data', (data) => {
        const message = data.toString('utf-8');
        this.request = new IncomingMessage(message);
        this.response = new ServerResponse(socket);
        this.handler(this.request, this.response);
      });

      socket.on('error', (error) => {
        this.emit('error', error);
      });
    });
  }

  listen(port, cb) {
    this.server.listen(port, cb);
    this.server.on('error', (error) => this.emit('error', error));
  }
}

const createServer = (handler) => {
  return new HTTP(handler);
};

export default {
  createServer
};
