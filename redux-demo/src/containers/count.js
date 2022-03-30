import React, { Component } from 'react';
import { connect } from 'react-redux';
import {
  createIncreaseAction,
  createDecreaseAction
} from '../redux/actions/count';

class Count extends Component {
  increase = () => {
    const { value } = this.selectNum;

    this.props.increase(value);
  };

  decreases = () => {
    const { value } = this.selectNum;
    this.props.decrease(value);
  };

  increaseIfOdd = () => {
    const { value } = this.selectNum;
    if (this.props.count % 2 !== 0) {
      this.props.increase(value);
    }
  };

  increaseAsync = () => {
    const { value } = this.selectNum;
    setTimeout(() => {
      this.props.increase(value);
    }, 500);
  };

  render() {
    console.log('##', this.props);
    return (
      <div>
        <h1>结果为 {this.props.count}</h1>
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

export default connect((state) => ({ count: state }), {
  increase: createIncreaseAction,
  decrease: createDecreaseAction
})(Count);
