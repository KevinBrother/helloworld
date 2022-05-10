import React from 'react';
import { add } from './utils'
import './style.less'

export default function Bar() {
  return (
    <>
      <div className='div-border'>这是bar组件的内容 {add(1, 1)}</div>
    </>
  );
}
