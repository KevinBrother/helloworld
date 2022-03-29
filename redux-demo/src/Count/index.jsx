import React, { Component } from 'react';
import store from '../redux/store';
export default class Count extends Component {
  componentDidMount() {
    store.subscribe(() => {
      this.setState({});
    });
  }

  increase = () => {
    const { value } = this.selectNum;

    store.dispatch({ type: 'increase', date: value });
  };

  decreases = () => {
    const { value } = this.selectNum;
    store.dispatch({ type: 'decrease', date: value });
  };

  increaseIfOdd = () => {
    const { value } = this.selectNum;
    const count = store.getState();
    if (count % 2 !== 0) {
      store.dispatch({ type: 'increase', date: value });
    }
  };

  increaseAsync = () => {
    const { value } = this.selectNum;
    setTimeout(() => {
      store.dispatch({ type: 'increase', date: value });
    }, 500);
  };

  render() {
    console.log('##', store.getState());
    return (
      <div>
        <h1>结果为 {store.getState()}</h1>
        <select ref={(c) => (this.selectNum = c)}>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>

        <button onClick={this.increase}>+</button>
        <button onClick={this.decreases}>-</button>
        <button onClick={this.increaseIfOdd}>奇数加</button>
        <button onClick={this.increaseAsync}>异步的加</button>
      </div>
    );
  }
}
