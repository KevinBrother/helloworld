// 判断是否是微信
export const isWeixin = () => {
  var ua = navigator.userAgent.toLowerCase();
  return ua.match(/MicroMessenger/i) !== null;
};

export const reqGetWxConfig = (url) => {
  return fetch('http://localhost:8085', { url }).then((rep) => {
    return rep.json();
  });
};
