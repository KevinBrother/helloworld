import React, { useState, useCallback } from 'react';

function CountColor(props) {
  const { count, handleStart } = props;

  console.log('子组件重新渲染了。。。');

  const color = count > 5 ? 'red' : 'green';

  return (
    <div style={{ color }}>
      {count}
      <button className="btn btn-primary" onClick={handleStart}>
        自组件点击
      </button>
    </div>
  );
}

export default function Counter() {
  const [count, setCount] = useState(0);
  const [isRender] = useState(false);

  console.log(
    '[ 每次setState，是只有return的语句调用，还是整个组件调用了以次？ ] >',
    '掉用了整个组件（函数）哦'
  );

  // const  handleIncrement = () => setCount(count + 1);
  // const handleIncrement = useCallback(() => console.log(111));
  // 开始计时的事件处理函数
  // TODO 2022年4月13日 10:38:38 用了useCallback 自组件还是重复渲染了，也没整明白
  const handleStart = useCallback(() => {
    // 使用 current 属性设置 ref 的值
    let a = 1;
    console.log(a);
  }, []);

  return (
    <>
      <div>{count}</div>
      <CountColor handleIncrement={handleStart} />
      <button className="btn btn-primary" onClick={() => setCount(count + 1)}>
        + 1
      </button>
    </>
  );
}
