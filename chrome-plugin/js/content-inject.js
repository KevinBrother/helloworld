(function () {
  let path = 'js/inject.js';
  let script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  // 注意，路径需用Chrome API 生成，这个方法可以获得插件的资源的真实路径。
  // 类似：chrome-extension://ihcokhadfjfchaeagdoclpnjdiokfakg/js/inject.js
  script.src = chrome.extension.getURL(path);
  script.onload = function () {
    // 在执行完代码之后移除script标签
    this.parentNode.removeChild(this);
  };
  document.body.appendChild(script);
})();
