import { Hono } from "hono";
import { cors } from "hono/cors";

// 定义环境变量类型
interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2_BUCKET: R2Bucket;
}

// 声明全局类型
declare global {
  interface ExecutionContext {
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
  }
}

const app = new Hono<{ Bindings: Env }>();

// 启用 CORS
app.use("/*", cors());

// 健康检查接口
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// === D1 数据库相关接口 ===

// 初始化数据库（创建表）
app.post("/api/db/setup", async (c) => {
  try {
    await c.env.DB.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    return c.json({ success: true, message: "Database setup completed" });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error' }, 500);
  }
});

// 创建用户
app.post("/api/users", async (c) => {
  try {
    const { username, email } = await c.req.json();
    const result = await c.env.DB.prepare(
      "INSERT INTO users (username, email) VALUES (?, ?) RETURNING *"
    ).bind(username, email).first();
    return c.json({ success: true, user: result });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error' }, 500);
  }
});

// 获取所有用户
app.get("/api/users", async (c) => {
  try {
    const result = await c.env.DB.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
    return c.json({ success: true, users: result.results });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error' }, 500);
  }
});

// 获取单个用户
app.get("/api/users/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const result = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
    if (!result) {
      return c.json({ success: false, error: "User not found" }, 404);
    }
    return c.json({ success: true, user: result });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error' }, 500);
  }
});

// === KV 存储相关接口 ===

// 设置 KV 值
app.post("/api/kv/:key", async (c) => {
  try {
    const { key } = c.req.param();
    const { value, ttl } = await c.req.json();
    
    const options: any = {};
    if (ttl) options.expirationTtl = ttl;
    
    await c.env.KV.put(key, JSON.stringify(value), options);
    return c.json({ success: true, message: `Key '${key}' set successfully` });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error' }, 500);
  }
});

// 获取 KV 值
app.get("/api/kv/:key", async (c) => {
  try {
    const { key } = c.req.param();
    const value = await c.env.KV.get(key);
    if (value === null) {
      return c.json({ success: false, error: "Key not found" }, 404);
    }
    return c.json({ success: true, key, value: JSON.parse(value) });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error' }, 500);
  }
});

// 删除 KV 值
app.delete("/api/kv/:key", async (c) => {
  try {
    const { key } = c.req.param();
    await c.env.KV.delete(key);
    return c.json({ success: true, message: `Key '${key}' deleted successfully` });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error' }, 500);
  }
});

// 列出所有 KV 键
app.get("/api/kv", async (c) => {
  try {
    const result = await c.env.KV.list();
    return c.json({ success: true, keys: result.keys });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error' }, 500);
  }
});

// === R2 存储相关接口 ===

// 上传文件到 R2
app.post("/api/r2/upload/:filename", async (c) => {
  try {
    const { filename } = c.req.param();
    const body = await c.req.arrayBuffer();
    
    await c.env.R2_BUCKET.put(filename, body, {
      httpMetadata: {
        contentType: c.req.header("content-type") || "application/octet-stream",
      },
    });
    
    return c.json({ success: true, message: `File '${filename}' uploaded successfully` });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error' }, 500);
  }
});

// 从 R2 下载文件
app.get("/api/r2/:filename", async (c) => {
  try {
    const { filename } = c.req.param();
    const object = await c.env.R2_BUCKET.get(filename);
    
    if (!object) {
      return c.json({ success: false, error: "File not found" }, 404);
    }
    
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    
    return new Response(object.body, { headers });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error' }, 500);
  }
});

// 删除 R2 文件
app.delete("/api/r2/:filename", async (c) => {
  try {
    const { filename } = c.req.param();
    await c.env.R2_BUCKET.delete(filename);
    return c.json({ success: true, message: `File '${filename}' deleted successfully` });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error' }, 500);
  }
});

// 列出 R2 存储桶中的文件
app.get("/api/r2", async (c) => {
  try {
    const result = await c.env.R2_BUCKET.list();
    return c.json({ 
      success: true, 
      objects: result.objects.map((obj: any) => ({
        key: obj.key,
        size: obj.size,
        lastModified: obj.uploaded,
        etag: obj.etag
      }))
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error' }, 500);
  }
});

// === 综合演示接口 ===

// 演示所有服务的综合使用
app.post("/api/demo", async (c) => {
  try {
    const { username, email, message } = await c.req.json();
    
    // 1. 在 D1 中创建用户
    const user = await c.env.DB.prepare(
      "INSERT INTO users (username, email) VALUES (?, ?) RETURNING *"
    ).bind(username, email).first();
    
    if (!user) {
      return c.json({ success: false, error: "Failed to create user" }, 500);
    }
    
    // 2. 在 KV 中存储用户会话
    const sessionId = crypto.randomUUID();
    await c.env.KV.put(`session:${sessionId}`, JSON.stringify({
      userId: user.id,
      username: user.username,
      createdAt: new Date().toISOString()
    }), { expirationTtl: 3600 }); // 1小时过期
    
    // 3. 在 R2 中存储用户消息文件
    const messageFile = `messages/${user.id}-${Date.now()}.txt`;
    await c.env.R2_BUCKET.put(messageFile, message, {
      httpMetadata: {
        contentType: "text/plain",
      },
    });
    
    return c.json({
      success: true,
      message: "Demo completed successfully",
      data: {
        user,
        sessionId,
        messageFile
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error' }, 500);
  }
});

// API 文档
app.get("/", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cloudflare Workers Demo</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .endpoint { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .method { font-weight: bold; color: #007acc; }
        .path { font-family: monospace; background: #f5f5f5; padding: 2px 5px; }
        .description { margin-top: 10px; color: #666; }
      </style>
    </head>
    <body>
      <h1>Cloudflare Workers Demo API</h1>
      <p>这个演示展示了 Cloudflare Workers 与 D1、KV、R2 的集成使用。</p>
      
      <h2>D1 数据库接口</h2>
      <div class="endpoint">
        <div><span class="method">POST</span> <span class="path">/api/db/setup</span></div>
        <div class="description">初始化数据库表</div>
      </div>
      <div class="endpoint">
        <div><span class="method">POST</span> <span class="path">/api/users</span></div>
        <div class="description">创建用户 (JSON: {username, email})</div>
      </div>
      <div class="endpoint">
        <div><span class="method">GET</span> <span class="path">/api/users</span></div>
        <div class="description">获取所有用户</div>
      </div>
      <div class="endpoint">
        <div><span class="method">GET</span> <span class="path">/api/users/:id</span></div>
        <div class="description">获取指定用户</div>
      </div>
      
      <h2>KV 存储接口</h2>
      <div class="endpoint">
        <div><span class="method">POST</span> <span class="path">/api/kv/:key</span></div>
        <div class="description">设置 KV 值 (JSON: {value, ttl?})</div>
      </div>
      <div class="endpoint">
        <div><span class="method">GET</span> <span class="path">/api/kv/:key</span></div>
        <div class="description">获取 KV 值</div>
      </div>
      <div class="endpoint">
        <div><span class="method">DELETE</span> <span class="path">/api/kv/:key</span></div>
        <div class="description">删除 KV 值</div>
      </div>
      <div class="endpoint">
        <div><span class="method">GET</span> <span class="path">/api/kv</span></div>
        <div class="description">列出所有 KV 键</div>
      </div>
      
      <h2>R2 存储接口</h2>
      <div class="endpoint">
        <div><span class="method">POST</span> <span class="path">/api/r2/upload/:filename</span></div>
        <div class="description">上传文件到 R2</div>
      </div>
      <div class="endpoint">
        <div><span class="method">GET</span> <span class="path">/api/r2/:filename</span></div>
        <div class="description">从 R2 下载文件</div>
      </div>
      <div class="endpoint">
        <div><span class="method">DELETE</span> <span class="path">/api/r2/:filename</span></div>
        <div class="description">删除 R2 文件</div>
      </div>
      <div class="endpoint">
        <div><span class="method">GET</span> <span class="path">/api/r2</span></div>
        <div class="description">列出 R2 存储桶文件</div>
      </div>
      
      <h2>综合演示</h2>
      <div class="endpoint">
        <div><span class="method">POST</span> <span class="path">/api/demo</span></div>
        <div class="description">综合演示所有服务 (JSON: {username, email, message})</div>
      </div>
    </body>
    </html>
  `);
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};