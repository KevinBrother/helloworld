import Bar from './Bar';
import React from 'react';
import ReactDom from 'react-dom';
import './asset/default.less';
import logo from './asset/logo.png';

function Foo() {
  return (
    <>
      <Bar />
      <div>this is react 的jsx</div>
      <img src={logo} alt="" />
    </>
  );
}

ReactDom.render(<Foo />, document.getElementById('root'));
