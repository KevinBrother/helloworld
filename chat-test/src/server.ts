import express, { Request, Response } from "express";
import { generateLoremSentence } from "./lorem";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static("public"));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

interface Message {
  role: string;
  content: string;
}

interface ChatRequest {
  model?: string;
  messages: Message[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
}

interface OpenAIChoice {
  index: number;
  delta: {
    role?: string;
    content?: string;
  };
  finish_reason?: string | null;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
}

// OpenAI兼容的SSE响应函数
function sendOpenAISSEResponse(
  res: Response,
  messages: Message[],
  model: string = "gpt-3.5-turbo",
  logPrefix: string = ""
) {
  const lastMessage = messages[messages.length - 1];
  console.log(`${logPrefix}Received message: ${lastMessage.content}`);

  const sessionId = `chatcmpl-${Date.now()}${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  const created = Math.floor(Date.now() / 1000);

  // 追踪连接状态
  let isConnected = true;
  res.on('close', () => {
    isConnected = false;
    console.log(`${logPrefix}Connection closed`);
  });

  // 立即发送空数据以建立连接
  res.write(': connected\n\n');
  (res as any).flush?.();

  // 发送初始角色消息
  const initialResponse: OpenAIResponse = {
    id: sessionId,
    object: "chat.completion.chunk",
    created: created,
    model: model,
    choices: [
      {
        index: 0,
        delta: {
          role: "assistant",
        },
        finish_reason: null,
      },
    ],
  };

  res.write(`data: ${JSON.stringify(initialResponse)}\n\n`);
  (res as any).flush?.(); // 强制刷新缓冲区
  console.log(`${logPrefix}Sent initial role message`);

  // 使用延时发送消息，模拟打字效果
  let messageIndex = 0;
  const totalChunks = 8;

  const sendNextChunk = () => {
    if (!isConnected) {
      console.log(`${logPrefix}Stopping - client disconnected`);
      return;
    }
    
    if (messageIndex >= totalChunks) {
      // 发送最后一个空内容的chunk
      const finalResponse: OpenAIResponse = {
        id: sessionId,
        object: "chat.completion.chunk",
        created: created,
        model: model,
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: "stop",
          },
        ],
      };
      res.write(`data: ${JSON.stringify(finalResponse)}\n\n`);
      (res as any).flush?.(); // 强制刷新缓冲区

      // 发送结束标记
      console.log(`${logPrefix}Sending [DONE]`);
      res.write("data: [DONE]\n\n");
      (res as any).flush?.(); // 强制刷新缓冲区
      res.end();
      return;
    }

    const sentence = generateLoremSentence();
    const chunkResponse: OpenAIResponse = {
      id: sessionId,
      object: "chat.completion.chunk",
      created: created,
      model: model,
      choices: [
        {
          index: 0,
          delta: {
            content: sentence + " ",
          },
          finish_reason: null,
        },
      ],
    };

    const jsonData = JSON.stringify(chunkResponse);
    console.log(`${logPrefix}Sending chunk ${messageIndex}: ${jsonData}`);
    res.write(`data: ${jsonData}\n\n`);
    (res as any).flush?.(); // 强制刷新缓冲区

    messageIndex++;

    // 短延时模拟打字效果
    const delay = 50; // 固定50ms延时
    setTimeout(sendNextChunk, delay);
  };

  // 立即开始发送第一个内容块
  sendNextChunk();
}

// OpenAI兼容的聊天完成端点
app.post("/v1/chat/completions", (req: Request, res: Response) => {
  const {
    model = "gpt-3.5-turbo",
    messages,
    stream = true,
  }: ChatRequest = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: {
        message: "Messages array is required and cannot be empty",
        type: "invalid_request_error",
        code: "missing_required_parameter",
      },
    });
  }

  if (stream) {
    // SSE 流式响应
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      // Expires: "0",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, Cache-Control",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "X-Accel-Buffering": "no",
      "Transfer-Encoding": "chunked",
    });

    sendOpenAISSEResponse(res, messages, model, "[OpenAI SSE] ");


    // 设置保持连接活跃
    req.socket.setKeepAlive(true);
    req.socket.setTimeout(0);
  } else {
    // 非流式响应
    const sessionId = `chatcmpl-${Date.now()}${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const created = Math.floor(Date.now() / 1000);

    // 生成完整回复
    const fullContent = Array.from({ length: 5 }, () =>
      generateLoremSentence()
    ).join(" ");

    const response = {
      id: sessionId,
      object: "chat.completion",
      created: created,
      model: model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: fullContent,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: messages.reduce(
          (sum, msg) => sum + msg.content.length / 4,
          0
        ),
        completion_tokens: fullContent.length / 4,
        total_tokens:
          messages.reduce((sum, msg) => sum + msg.content.length / 4, 0) +
          fullContent.length / 4,
      },
    };

    res.json(response);
  }
});

// 兼容性端点 - 原有的POST endpoint
app.post("/api/chat/stream", (req: Request, res: Response) => {
  const { messages }: ChatRequest = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Messages array is required" });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Cache-Control",
    "X-Accel-Buffering": "no"
  });

  // 为Legacy端点创建自定义格式的SSE响应函数
  const sendLegacySSEResponse = (res: Response, messages: Message[], logPrefix: string) => {
    const lastMessage = messages[messages.length - 1];
    console.log(`${logPrefix}Received message: ${lastMessage.content}`);

    // 追踪连接状态
    let isConnected = true;
    res.on('close', () => {
      isConnected = false;
      console.log(`${logPrefix}Connection closed`);
    });

    // 生成完整的回复内容
    const fullContent = Array.from({ length: 5 }, () => generateLoremSentence()).join(' ');
    const words = fullContent.split(' ').filter(word => word.length > 0);
    
    // 发送初始消息
    const initialData = {
      code: 0,
      data: {
        content: words[0] || "Hello",
        hitted: 1,
        question_type: "normal",
        role: "assistant",
        type: "initial"
      },
      msg: "OK"
    };

    res.write(`data: ${JSON.stringify(initialData)}\n\n`);
    (res as any).flush?.();
    console.log(`${logPrefix}Sent initial message`);

    let wordIndex = 1;
    let accumulatedContent = words[0] || "Hello";

    const sendNextWord = () => {
      if (!isConnected) {
        console.log(`${logPrefix}Stopping - client disconnected`);
        return;
      }
      
      if (wordIndex >= words.length) {
        // 发送完成消息
        const finishData = {
          code: 0,
          data: {
            chunks: null,
            dataIDs: null,
            fullContent: accumulatedContent,
            hitted: 1,
            questionType: "normal",
            role: "assistant",
            type: "finish"
          },
          msg: "OK"
        };
        
        res.write(`data: ${JSON.stringify(finishData)}\n\n`);
        (res as any).flush?.();
        console.log(`${logPrefix}Sent finish message`);
        res.end();
        return;
      }

      // 发送更新消息
      const currentWord = words[wordIndex];
      const updateData = {
        code: 0,
        data: {
          content: wordIndex === words.length - 1 ? currentWord : currentWord + " ",
          type: "update"
        },
        msg: "OK"
      };

      res.write(`data: ${JSON.stringify(updateData)}\n\n`);
      (res as any).flush?.();
      console.log(`${logPrefix}Sent update: ${currentWord}`);
      
      accumulatedContent += (wordIndex === words.length - 1 ? currentWord : " " + currentWord);
      wordIndex++;

      // 短延时模拟打字效果
      const delay = 100;
      setTimeout(sendNextWord, delay);
    };

    // 延时后开始发送更新
    setTimeout(sendNextWord, 200);
  };

  sendLegacySSEResponse(res, messages, "[Legacy] ");
});

// GET endpoint for EventSource SSE
app.get("/api/chat/stream", (req: Request, res: Response) => {
  const messagesParam = req.query.messages as string;

  if (!messagesParam) {
    return res
      .status(400)
      .json({ error: "Messages query parameter is required" });
  }

  let messages;
  try {
    messages = JSON.parse(decodeURIComponent(messagesParam));
  } catch (error) {
    return res.status(400).json({ error: "Invalid messages format" });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  });

  sendOpenAISSEResponse(res, messages, "gpt-3.5-turbo", "[GET] ");

  req.on("close", () => {
    res.end();
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (req: Request, res: Response) => {
  res.send(`
    <html>
      <head>
        <title>OpenAI Compatible Chatbot Server</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .container { max-width: 900px; margin: 0 auto; }
          .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .openai { background: #e8f5e8; border-left: 4px solid #4caf50; }
          code { background: #e0e0e0; padding: 2px 4px; border-radius: 3px; }
          pre { background: #f8f8f8; padding: 10px; border-radius: 3px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>OpenAI Compatible Chatbot Server with SSE</h1>
          <p>Available endpoints:</p>
          
          <div class="endpoint openai">
            <h3>🚀 POST /v1/chat/completions (OpenAI Compatible)</h3>
            <p>OpenAI Chat Completions API compatible endpoint with streaming support</p>
            <p><strong>Headers:</strong> <code>Content-Type: application/json</code></p>
            <p><strong>Body (Stream):</strong></p>
            <pre>{
  "model": "gpt-3.5-turbo",
  "messages": [{"role": "user", "content": "Hello!"}],
  "stream": true
}</pre>
            <p><strong>Body (Non-stream):</strong></p>
            <pre>{
  "model": "gpt-3.5-turbo", 
  "messages": [{"role": "user", "content": "Hello!"}],
  "stream": false
}</pre>
          </div>
          
          <div class="endpoint">
            <h3>POST /api/chat/stream (Legacy)</h3>
            <p>Legacy streaming endpoint for backward compatibility</p>
            <p><strong>Body:</strong> <code>{"messages": [{"role": "user", "content": "your message"}]}</code></p>
          </div>
          
          <div class="endpoint">
            <h3>GET /api/chat/stream</h3>
            <p>Server-Sent Events endpoint for real-time chat via query parameters</p>
            <p><strong>Query:</strong> <code>?messages={"messages":[{"role":"user","content":"hello"}]}</code></p>
          </div>
          
          <div class="endpoint">
            <h3>GET /health</h3>
            <p>Health check endpoint</p>
          </div>

          <div class="endpoint">
            <h4>📋 Example cURL for OpenAI SSE:</h4>
            <pre>curl -X POST http://localhost:3001/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello, how are you?"}],
    "stream": true
  }'</pre>
          </div>
        </div>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Chatbot server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} for endpoint documentation`);
});
