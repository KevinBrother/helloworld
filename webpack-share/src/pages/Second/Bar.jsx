import React from 'react';
import '@assert/div.css';
import { commonA } from '@utils/sum';
import './index.css';

export function Bar() {
  commonA();
  return (
    <>
      <div className="img">aaa</div>
      <div>Hello second Bar</div>;
    </>
  );
}
