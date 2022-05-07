import React from 'react';
import { add } from './utils'
export default function Bar() {
  return (
    <>
      <div>这是bar组件的内容 {add(1, 1)}</div>
    </>
  );
}
