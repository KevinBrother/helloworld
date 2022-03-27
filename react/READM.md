# react 学习笔记

## 1 - react入门

- 类似jquery的使用和学习方式
- jsx的语法规则
- 虚拟dom的两种定义方式
- <font color='red'>es6的语法需要着重学习！！！</font>

## 5. 拆分组件与组件通信

- 注意className与style的写法（class => className, style => 变为对象）
- 如何确定将数据放在哪个组件的state中？
  - 某个组件使用：放在其自身的state中
  - 某些组件使用：放在他们公共的父组件state中（状态提升）
- 状态在哪里，操作状态的方法就在哪里