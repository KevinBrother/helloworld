var backend = chrome.extension.getBackgroundPage();
console.log('backend :>> ', backend);
backend.test(); // 访问bbackground的函数

function test() {
  console.log('popup 中的test 函数');
}
