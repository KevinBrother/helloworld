# react-router-dom v5

## 细节

- 最外层需要BrowserRouter或者HashRouter包裹
- 默认模糊匹配，严格模式和嵌套路由的冲突
- 

## 向路由组件传递参数

- params
- search
- state

## BrowserRouter与HashRouter的区别
- 底层原理不一样：
  - BrowserRouter,用的H5的api，的不兼容IE9一下浏览器
- 但是都能起到不刷新界面，但是切换url的效果(参考 [history](https://github.com/remix-run/history#readme)的库)  
