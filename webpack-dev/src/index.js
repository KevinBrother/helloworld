import React from 'react';
import ReactDom from 'react-dom';

function Foo() {
  return (
    <>
      <div>this is index 的jsx</div>
    </>
  );
}

ReactDom.render(<Foo />, document.getElementById('root'));
