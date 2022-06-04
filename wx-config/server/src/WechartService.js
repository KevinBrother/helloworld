import WechatDao from './WechatDao.js';

class WechatService {
  // 获取微信的 access_token
  async getAccessToken() {
    // TODO 获取微信access_token
    let body = await WechatDao.getAccessToken();
    return new Promise((resolve, reject) => {
      console.log('------AccessToken----', body);

      const { access_token } = body;

      if (!access_token) {
        throw new Error(-500, '微信配置错误！');
      }

      resolve(access_token);
    });
  }

  // 获取微信的js ticket
  async getJsApiTicket(accessToken) {
    let body = await WechatDao.getJsApiTicket(accessToken);
    return new Promise((resolve, reject) => {
      console.log('------ticket----', body);
      const { ticket, errcode } = body;
      if (errcode) {
        throw new Error(-500, '微信配置错误！');
      }

      resolve(ticket);
    });
  }
}

export default new WechatService();
