import React from 'react';
import ReactDom from 'react-dom';

function Bar() {
  return (
    <>
      <h1>this is Bar 组件</h1>
    </>
  );
}

ReactDom.render(<Bar />, document.getElementById('root'));
