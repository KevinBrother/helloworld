import Koa from 'koa';
import fetch from 'node-fetch';
import routers from './src/routers.js';

globalThis.fetch = fetch;

const app = new Koa();

// x-response-time
app.use(async (ctx, next) => {
  const start = Date.now();
  // 设置跨域请求头
  ctx.res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With');
  ctx.res.setHeader('Access-Control-Allow-Origin', '*');
  ctx.res.setHeader(
    'Access-Control-Allow-Methods',
    'PUT,POST,GET,DELETE,OPTIONS'
  );
  ctx.res.setHeader('X-Powered-By', ' 3.2.1');
  ctx.res.setHeader('Content-Type', 'application/json;charset=utf-8');
  await next();
  const ms = Date.now() - start;
  ctx.set('X-Response-Time', `${ms}ms`);
});

app.use(routers.routes());

const port = process.env.PORT || 8085;
// logger.info(process.env.PORT);
app.listen(port, function () {
  // nodemon app.js
  // TODO 端口接参数形式
  console.log(' app is running at http://localhost:8085');
});

/*app.on('error', (err, ctx) => {
    console.log('server error', err);
});*/

export default app;
