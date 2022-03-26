# 生命周期 [官方示意图](https://projects.wojtekmaj.pl/react-lifecycle-methods-diagram/)

## 旧版（16x）

- 挂载时: constructor => componentWillMount => render => componentDidMount
- 更新时: componentWillReceiveProps => shouldComponentUpdate => componentWillUpdate => render => componentDidUpdate
- 强制更新时: componentWillUpdate => render => componentDidUpdate

## 新版 （17x）

- `componentWillMount`、`componentWillReceiveProps`、`componentWillUpdate` 标为废弃，如需使用需要加上`UNSAFE_`前缀,如 `UNSAFE_componentWillMount`。
- 在挂在的 `constructor` 之后，或者更新的 `shouldComponentUpdate` 之前，新增 `getDerivedStateFromProps`钩子。
- 在 `render` 之后，`componentDidUpdate`之前新增 `getSnapshotBeforeUpdate` 钩子
