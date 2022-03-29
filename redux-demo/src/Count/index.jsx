import React, { Component } from 'react';

export default class Count extends Component {
  state = { count: 0 };

  increases = () => {
    const { value } = this.selectNum;
    this.setState((state) => ({ count: state.count + value * 1 }));
  };

  decreases = () => {
    const { value } = this.selectNum;
    this.setState((state) => ({ count: state.count - value * 1 }));
  };

  increasesIfOdd = () => {
    const { value } = this.selectNum;
    const { count } = this.state;
    if (count % 2 !== 0) {
      this.setState({ count: count + value * 1 });
    }
  };

  increasesAsync = () => {
    const { value } = this.selectNum;
    setTimeout(() => {
      this.setState((state) => ({ count: state.count + value * 1 }));
    }, 500);
  };

  render() {
    return (
      <div>
        <h1>结果为 {this.state.count}</h1>
        <select ref={(c) => (this.selectNum = c)}>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>

        <button onClick={this.increases}>+</button>
        <button onClick={this.decreases}>-</button>
        <button onClick={this.increasesIfOdd}>奇数加</button>
        <button onClick={this.increasesAsync}>异步的加</button>
      </div>
    );
  }
}
