import Bar from './Bar';
import React from 'react';
import ReactDom from 'react-dom';
import { log } from './other';

function Foo() {
  return (
    <>
      <Bar />
      <div>this is react 的jsx {log()}</div>
    </>
  );
}

ReactDom.render(<Foo />, document.getElementById('root'));
