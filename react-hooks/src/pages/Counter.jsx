import React from 'react';
import useCounter from '../hooks/useCounter';

export default function Counter() {
  const { count, increment, decrement, reset } = useCounter();
  return (
    <>
      <div>{count}</div>
      <button className="btn btn-primary" onClick={increment}>
        + 1
      </button>
      <button className="btn btn-primary" onClick={decrement}>
        - 1
      </button>
      <button className="btn btn-primary" onClick={reset}>
        reset
      </button>
    </>
  );
}
