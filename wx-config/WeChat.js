import { isWeixin, reqGetWxConfig } from './util.js';

const jsApiList = [
  'chooseImage',
  'chooseWXPay'
  // "wx-open-launch-app",
];

class WeChat {
  constructor() {
    // 初始化微信的东西，实例化的时候就创建
    // 判断是否为微信浏览器内
    if (!isWeixin()) {
      console.log('-------当前环境不是微信浏览器哦----------');
      return;
    }

    const url = location.href.split('#')[0];

    // 异步写法，可能会有问题
    reqGetWxConfig(url).then((wxConfig) => {
      const { appId, timestamp, noncestr, signature } = wxConfig.data;

      // wx对象来自导入的JS-SDK
      wx.config({
        debug: false, // 开启调试模式,调用'的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
        appId, // 必填，公众号的唯一标识
        timestamp, // 必填，生成签名的时间戳
        nonceStr: noncestr, // 必填，生成签名的随机串
        signature, // 必填，签名
        jsApiList, // 必填，需要使用的JS接口列表
        openTagList: ['wx-open-launch-app'] // 获取开放标签权限
      });
    });
  }

  /**
   * 微信每次进入页面进行初始化
   */
  ready() {
    wx.ready(function () {
      console.log('------------------------ready------------------------');
      wx.checkJsApi({
        jsApiList, // 需要检测的JS接口列表，所有JS接口列表见附录2,
        success: function (res) {
          console.log('--------checkJsApi success---------------', res);
          // dispatcher.publish('wxConfigSuccess', res);
        }
      });
    });

    wx.error(function (res) {
      // config信息验证失败会执行error函数，如签名过期导致验证失败，具体错误信息可以打开config的debug模式查看，也可以在返回的res参数中查看，对于SPA可以在这里更新签名
      console.log('--------checkJsApi err ---------------', res);
    });
  }

  // 支付的具体参数
  pay(params) {
    wx.chooseWXPay({
      timestamp: 0, // 支付签名时间戳，注意微信 jssdk 中的所有使用 timestamp 字段均为小写。但最新版的支付后台生成签名使用的 timeStamp 字段名需大写其中的 S 字符
      nonceStr: '', // 支付签名随机串，不长于 32 位
      package: '', // 统一支付接口返回的prepay_id参数值，提交格式如：prepay_id=\*\*\*）
      signType: '', // 微信支付V3的传入 RSA ,微信支付V2的传入格式与V2统一下单的签名格式保持一致
      paySign: '', // 支付签名
      success: function (res) {
        // 支付成功后的回调函数
      }
    });
  }
}

export const wechat = new WeChat();
