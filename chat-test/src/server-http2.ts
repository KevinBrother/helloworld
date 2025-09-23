import express, { Request, Response } from 'express';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { generateLoremSentence } from './lorem';

const app = express();
const PORT = process.env.PORT || 3001;

// HTTPS server options (modern browsers will negotiate HTTP/2 via ALPN)
const serverOptions = {
  key: fs.readFileSync(path.join(__dirname, '../certs/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../certs/cert.pem'))
};

app.use(express.json());
app.use(express.static('public'));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

interface Message {
  role: string;
  content: string;
}

interface ChatRequest {
  messages: Message[];
}

// 公共SSE响应函数
function sendSSEResponse(res: Response, messages: Message[], logPrefix: string = '') {
  const lastMessage = messages[messages.length - 1];
  console.log(`${logPrefix}Received message: ${lastMessage.content}`);

  // 立即发送初始消息确认连接
  res.write('data: {"content":"Starting response...","index":0}\n\n');
  console.log(`${logPrefix}Sent initial message`);

  // 使用延时发送消息，模拟打字效果
  let messageIndex = 1;
  const totalChunks = 8;
  
  const sendNextChunk = () => {
    if (messageIndex > totalChunks) {
      // 发送结束标记
      console.log(`${logPrefix}Sending [DONE]`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const sentence = generateLoremSentence();
    const data = {
      content: sentence + ' ',
      index: messageIndex,
      timestamp: new Date().toISOString()
    };
    const jsonData = JSON.stringify(data);
    console.log(`${logPrefix}Sending chunk ${messageIndex}: ${jsonData}`);
    res.write(`data: ${jsonData}\n\n`);
    
    messageIndex++;
    
    // 随机延时400-800ms，模拟真实打字效果
    const delay = Math.random() * 10 + 10;
    setTimeout(sendNextChunk, delay);
  };

  // 延时800ms后开始发送第一个块
  setTimeout(sendNextChunk, 800);
}

// POST endpoint for SSE stream
app.post('/api/chat/stream', (req: Request, res: Response) => {
  const messages = [{ role: 'user', content: 'test' }];  
  // const { messages }: ChatRequest = req.body;
  // if (!messages || !Array.isArray(messages) || messages.length === 0) {
  //   return res.status(400).json({ error: 'Messages array is required' });
  // }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'X-Accel-Buffering': 'no' // 禁用反向代理缓冲，关键！
  });

  sendSSEResponse(res, messages, '[POST] ');

  req.on('close', () => {
    res.end();
  });
});

// GET endpoint for EventSource SSE
app.get('/api/chat/stream', (req: Request, res: Response) => {
  const messagesParam = req.query.messages as string;
  
  if (!messagesParam) {
    return res.status(400).json({ error: 'Messages query parameter is required' });
  }

  let messages;
  try {
    messages = JSON.parse(decodeURIComponent(messagesParam));
  } catch (error) {
    return res.status(400).json({ error: 'Invalid messages format' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  sendSSEResponse(res, messages, '[GET] ');

  req.on('close', () => {
    res.end();
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req: Request, res: Response) => {
  res.send(`
    <html>
      <head>
        <title>Chatbot Server</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .container { max-width: 800px; margin: 0 auto; }
          .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
          code { background: #e0e0e0; padding: 2px 4px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>HTTPS Chatbot Server with SSE</h1>
          <p>Available endpoints (HTTPS with HTTP/2 auto-negotiation):</p>
          
          <div class="endpoint">
            <h3>POST /api/chat</h3>
            <p>Send messages and receive streaming Lorem text response</p>
            <p><strong>Body:</strong> <code>{"messages": [{"role": "user", "content": "your message"}]}</code></p>
          </div>
          
          <div class="endpoint">
            <h3>GET /api/chat/stream</h3>
            <p>Server-Sent Events endpoint for real-time chat</p>
            <p><strong>Query:</strong> <code>?message=your+message</code></p>
          </div>
          
          <div class="endpoint">
            <h3>GET /health</h3>
            <p>Health check endpoint</p>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Create HTTPS server (browsers will automatically negotiate HTTP/2 via ALPN)
const server = https.createServer(serverOptions, app);

server.listen(PORT, () => {
  console.log(`HTTPS Chatbot server is running on port ${PORT}`);
  console.log(`Visit https://localhost:${PORT} for endpoint documentation`);
  console.log(`Note: You may need to accept the self-signed certificate in your browser`);
  console.log(`Modern browsers will automatically negotiate HTTP/2 via ALPN when available`);
});