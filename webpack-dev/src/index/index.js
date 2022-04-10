import React from 'react';
import ReactDom from 'react-dom';
import './default.less';
import logo from './logo.png';

function Foo() {
  return (
    <>
      <div>this is index 的jsx</div>
      <img src={logo} alt="" />
    </>
  );
}

ReactDom.render(<Foo />, document.getElementById('root'));
