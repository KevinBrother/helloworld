import React from 'react';
import ReactDom from 'react-dom';
import './style.less'
// import { get } from 'lodash'
import _ from 'lodash'

let obj = { a: [{ b: { c: 3 } }] }
const c = _.get(obj, 'a[0].b.c')

function Foo() {
  return (
    <>
      <div className='div-border'>this is second 的jsx=====  {c}</div>
    </>
  );
}

ReactDom.render(<Foo />, document.getElementById('root'));
