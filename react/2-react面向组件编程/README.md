# 组件式编程

## 函数式组件

- 首字母必须大写
- 必须有返回值
- 渲染函数必须是函数的标签形式或者调用函数的形式

- 函数式组件渲染过程  ReactDOM.render(<MyComponent />...) 之后，发生了什么？
  - React解析组件标签，找到了MyComponent组件
  - 发现组件是使用函数定义的，随后调用该函数，将放回的虚拟DOM通过babel处理转为真实DOM，随后呈现在页面中

## 类式组件

- render 定义在自定义组件的原型对象上，供实例使用
- render中的this，指向 自定义组件的实例对象

- 类式组件渲染过程  ReactDOM.render(<MyComponent />...) 之后，发生了什么？
  - React解析组件标签，找到了MyComponent组件
  - 发现组件是使用类定义的，随后new 出来该类的实例。并通过该实例调用原型上的render方法
  - 将放回的虚拟DOM通过babel处理转为真实DOM，随后呈现在页面中


## 事件
- 原生dom事件的名称改为了小驼峰，如 onclick => onClick
- 是把函数定义表达式赋值给react的事件 如 `onClick={myClick}`  `function myClick(){}`