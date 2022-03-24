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

- 构建器的作用
  - 是初始化状态
  - 解决dom事件的this指向问题
  - 调用1次
  - <font color='red'>可以通过赋值语句的方式直接给类添加state属性，以及通过箭头函数解决this指向问题</font>
  - 类的赋值语句是将方法与属性直接添加到类的实例中，而不是类的原型链上

- render函数的作用
  - 从状态中读取数据，然后返回jsx语句给react渲染
  - 调用1+n次，n为setState的次数

## 事件

- 原生dom事件的名称改为了小驼峰，如 onclick => onClick
- 是把函数定义表达式赋值给react的事件 如 `onClick={myClick}`  `function myClick(){}`

## 组件实例的三大属性

- state
  
- props
  - props 只读，不可修改
  - 传值的方式，1. 类似html的标签方式、2. jsx的对象方式
  - props可以通过 组件名的propTypes 进行类型定义(15.5以后需要导入prop-types.js）
  - props可以通过 组件名的defaultProps 定义默认值（15.5以后需要导入prop-types.js）
  - 构造函数中的props是否调用super取决于，是否需要在构造函数中直接通过this访问props<font color="red">一般不需要调用suer，直接使用即可</font>
  
- refs