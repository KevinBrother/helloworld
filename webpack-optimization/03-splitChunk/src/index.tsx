import Bar from './Bar';
import React from 'react';
import ReactDom from 'react-dom';
import { add } from './utils'
import './style.less'

function Foo() {
  return (
    <>
      <Bar />
      <div className='div-border'>this is react 的jsx===== {add(2, 2)}</div>
    </>
  );
}

ReactDom.render(<Foo />, document.getElementById('root'));
