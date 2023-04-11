import React from 'react';

export default function TransferParams(props) {
  const {
    name = '没给我什么名字',
    fn = () => {
      console.log('没传什么过来');
    }
  } = props;

  return (
    <>
      <h1>在组件中</h1>
      <button onClick={fn}>点击来自{name}中的方法</button>
    </>
  );
}
