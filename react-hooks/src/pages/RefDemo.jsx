import React, { useState, useRef, useCallback } from 'react';

export default function RefDemo() {
  const timer = useRef(null);
  const [time, setTime] = useState(0);

  const start = useCallback(() => {
    timer.current = setInterval(() => {
      // TODO 2022年4月13日 10:37:21 这个方法，每次点击启动会重复创建多个，且暂停无法取消掉，不是很能理解这个设计的作用
      console.log('[ 11 ] >', 11);
      setTime((time) => time + 1);
    }, 1000);
  }, []);

  const pause = useCallback(() => {
    clearInterval(timer.current);
    timer.current = null;
  }, []);

  return (
    <div>
      <h1>计时器组件，这个组件有开始和暂停两个功能</h1>
      {time}
      <button className="btn btn-primary" onClick={start}>
        启动
      </button>
      <button className="btn btn-primary" onClick={pause}>
        暂停
      </button>
      <RefDom />
    </div>
  );
}

function RefDom() {
  const inputRef = useRef(null);

  const focus = useCallback(() => {
    inputRef.current.focus();
  }, []);

  return (
    <div>
      <input ref={inputRef} type="text" name="" id="" />
      <button className="btn btn-primary" onClick={focus}>
        {' '}
        聚焦input
      </button>
    </div>
  );
}
