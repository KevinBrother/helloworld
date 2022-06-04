import Router from 'koa-router';
import wechatService from './WechartService.js';
import weChatConfig from './weChatConfig.js';
import crypto from 'crypto';
let router = new Router();

router.get('/', async (ctx, next) => {
  console.log(ctx.query);
  ctx.body = '恭喜 ,你启动成功了！';
});

// 用于接受微信回调，确认服务器是否可有
router.get('/wx', async (ctx, next) => {
  console.log(ctx.query);
  ctx.body = ctx.query.echostr;
});

/**
 * 获取微信config配置
 */
router.get('/getWxConfig', async (ctx, next) => {
  // 1. 获取微信的 access_token
  let accessToken = await wechatService.getAccessToken();
  console.log(
    '%c [ accessToken ]-22',
    'font-size:13px; background:pink; color:#bf2c9f;',
    accessToken
  );

  // 2. 获取微信的js ticket
  let ticket = await wechatService.getJsApiTicket(accessToken);

  let noncestr = Math.random().toString(36).substr(2);

  let timestamp = Date.parse(new Date().toString()) / 1000;
  let url = ctx.query.url;
  const content = `jsapi_ticket=${ticket}&noncestr=${noncestr}&timestamp=${timestamp}&url=${decodeURIComponent(
    url
  )}`;

  console.log('=======string1========', content);
  // 创建sha1 算法
  const sha1 = crypto.createHash('sha1');
  sha1.update(content);
  const signature = sha1.digest('hex');

  return (ctx.body = {
    code: 0,
    data: {
      appId: weChatConfig.appId,
      timestamp,
      noncestr,
      signature
    },
    msg: 'success'
  });
});

export default router;
