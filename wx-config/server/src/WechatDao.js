import weChatConfig from './weChatConfig.js';

let { appId, appSecret } = weChatConfig;

/**
 *
 * @param {RequestInfo | URL} input
 * @param {RequestInit} init?
 * @returns {Promise<any>}
 */
async function MyFetch(input, init) {
  const response = await fetch(input, init);
  return await response.json();
}

class WechatDao {
  /**
   * 获取微信的 access_token
   * @returns {Promise<*>}
   */
  async getAccessToken() {
    let url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
    return await MyFetch(url);
  }

  /**
   * 获取微信的js ticket
   */
  async getJsApiTicket(accessToken) {
    let url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${accessToken}&type=jsapi`;

    return MyFetch(url);
  }
}

export default new WechatDao();
