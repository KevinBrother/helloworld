import Bar from './Bar.jsx';
import React from 'react';
import ReactDom from 'react-dom';

function Foo() {
  return (
    <>
      <Bar />
      <div>this is react 的jsx</div>
    </>
  );
}

ReactDom.render(<Foo />, document.getElementById('root'));
