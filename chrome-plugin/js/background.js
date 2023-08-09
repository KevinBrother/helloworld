(function log() {
  console.log('this is background.js ');
})();

function test() {
  console.log('background 中的test 函数');
}

let views = chrome.extension.getViews({ type: 'popup' });
let popup = null;
if (views.length > 0) {
  popup = views[0];
  // 直接访问popup的函数
  popup.test();
}
