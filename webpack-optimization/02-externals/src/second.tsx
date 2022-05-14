import Bar from './Bar';
import React from 'react';
import ReactDom from 'react-dom';
import { add } from './utils'
import './style.less'

function Foo() {
  return (
    <>
      <Bar />
      <div className='div-border'>this is second 的jsx=====  {add(4, 4)}</div>
    </>
  );
}

ReactDom.render(<Foo />, document.getElementById('root'));
