# 1 react 入门

## 01_hello_react

通过浏览器类似jquery的学习方式

- 基本配置
  - 需要导入react的核心库以及react的dom操作、babel的转换库
  - babel的作用就是把jsx转换为js的创建dom的语法 如
  `const VDOM = <h1>hello, React</h1>;` =>   `React.createElement('h1', {}, 'hello, React');`
  - 使用jsx的脚本需要配置 `type="text/babel"` 或者  `type="text/jsx"` 来让babel识别和编译
  
- jsx
  - jsx 就是js + XML
  - jsx的产生就是为了创建虚拟dom更加方便,是js创建虚拟dom的语法糖

- 虚拟dom
  - 虚拟dom的两种创建方式（js与jsx）
  - 虚拟dom其实就是个普通的js对象
  - 虚拟dom相较于真实dom属性更少，由react维护再内存中，并由react负责把虚拟dom渲染为真实dom

## jsx语法规则

- 定义虚拟dom时，不需要写引号
- 标签中混入JS表达式时要用`{}`
- 样式类名指定不要用class，要用className（因为在js中class是类的关键字）
- 内联样式，要用 style={{key: value}}的形式来写
- 每次定义的虚拟dom，只能有一个根标签
- 标签必须闭合
- 标签首字母
  - 如果首字母小写，则将标签改为html中的同名元素，如果html中无该标签,则报错
  - 如果首字母大写，react就会去渲染对应的组件
- <font color="red">jsx中的只能写js表达式，不能写js语句</font>
  - 能赋值的都是表达式 及 var xxx = 表达式
    - a
    - a + b
    - demo(1)
    - arr.map()
    - function demo(){}
  - 不能赋值的都是语句
    - if(){}
    - switch(){}
    - for(){}