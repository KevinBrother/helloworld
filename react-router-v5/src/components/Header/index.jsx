import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
class Header extends Component {
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
        <h1>header</h1>
        <button onClick={this.back}>back</button>
        <button onClick={this.forward}>forward</button>
        <button onClick={this.go}>后退2</button>
      </div>
    );
  }
}

export default withRouter(Header);
