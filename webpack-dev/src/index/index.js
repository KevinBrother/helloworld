import React from 'react';
import ReactDom from 'react-dom';
import './default.less';
import { getA } from './tree-shaking';
import logo from './logo.png';

if (false) {
  console.log('这句也会被tree-shaking掉');
}

function Foo() {
  return (
    <>
      {console.log(12)}
      <div>this is index 的jsx {getA}</div>
      <img src={logo} alt="" />
    </>
  );
}

ReactDom.render(<Foo />, document.getElementById('root'));
