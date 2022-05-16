import Bar from './Bar';
import React from 'react';
import ReactDom from 'react-dom';
import { add } from './utils'
import './style.less'
import Line from './Line';


function Foo() {

  return (
    <>
      {<Bar />}
      <Line />
      <div className='div-border'>this is first 的jsx===== {add(1, 1)}</div>
    </>
  );
}

ReactDom.render(<Foo />, document.getElementById('root'));
