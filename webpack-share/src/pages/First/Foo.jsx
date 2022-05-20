import React from 'react';
import img from '@assert/img.png';
import { commonA } from '@utils/sum';
import '@assert/div.css';
import '@assert/img.less';

export function Foo() {
  const handleClick = () => {
    import('@utils/async').then(({ asyncFn }) => {
      asyncFn();
    });
  };

  commonA();

  return (
    <>
      <div>Hello first foo</div>
      <img src={img} alt="" />
      <button onClick={handleClick}>加载调用asyncFn</button>
    </>
  );
}
