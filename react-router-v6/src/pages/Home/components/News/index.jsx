import React, { Component } from 'react';

export default class News extends Component {
  useLocation;

  back = () => {
    this.props.history.goBack();
  };
  forward = () => {
    this.props.history.goForward();
  };

  go = () => {
    this.props.history.go(-2);
  };

  render() {
    return (
      <div>
        <button onClick={this.back}>back</button>
        <button onClick={this.forward}>forward</button>
        <button onClick={this.go}>后退2</button>
      </div>
    );
  }
}
