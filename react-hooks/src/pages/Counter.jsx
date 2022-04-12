import React, { useState } from 'react';

function CountColor(props) {
  const count = props.count;

  const color = count > 5 ? 'red' : 'green';

  return <div style={{ color }}>{count}</div>;
}

export default function Counter() {
  const [count, setCount] = useState(0);

  console.log(
    '[ 每次setState，是只有return的语句调用，还是整个组件调用了以次？ ] >',
    '掉用了整个组件（函数）哦'
  );

  return (
    <>
      <div>{count}</div>
      <CountColor count={count} />
      <button className="btn btn-primary" onClick={() => setCount(count + 1)}>
        + 1
      </button>
    </>
  );
}
