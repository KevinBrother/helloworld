# webgl

## base

个人理解参考 [OpenGL底层实现原理](https://blog.csdn.net/qq_23034515/article/details/108132191)

1. openGL: 就是接口标准（和ECMAScript一样），主要是显卡与浏览器厂商实现
2. webgl就是web端对openGL的接口实现，能让前端开发人员在web浏览器实现2d与3d的绘制(其实最后是GPU画的)
3. 计算机图形的图形系统需要CPU提供下基本的参数和配置，然后再GPU内部实现图形的渲染，再传输到前端。
4. openGL利用GPU进行图形绘制,主要做两件事
  - 1.配置图元的位置，通过定点着色器实现
  - 2.配置图元的颜色，通过图元着色器实现
  - 着色器是`GLSL ES`语言实现，类似C语言
  - 而且在webgl也得手动写`GLSL ES语言`
