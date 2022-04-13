# react hooks的一些实践案例

## useCallback

- 实践下来，没看到作用（是要搭配自组件的Memo使用？）
- useCallback的用处应该在于利用memoize减少不必要的子组件的重新渲染问题，而不是函数组件过多内部函数的问题。

## useRef

- 案例中的timer会重复定义
