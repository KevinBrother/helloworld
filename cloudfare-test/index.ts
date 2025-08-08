import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// 启用 CORS
app.use("/*", cors());

// 健康检查接口
app.get("/health", (c) => c.json({ status: "ok" }));

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};
