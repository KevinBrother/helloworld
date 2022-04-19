/* import React, { useState } from 'react';

function CountRenderProps({ children }) {
  const [count, setCount] = useState(0);

  const increment = function () {
    setCount(count + 1);
  };
  const decrement = function () {
    setCount(count - 1);
  };

  return children({ count, increment, decrement });
}

function NormalFunction() {
  return [112, 12, 32];
  // return { key: 112 };
}

export default function RenderProps() {
  return (
    <CountRenderProps>
      {({ count, increment, decrement }) => {
        return (
          <div>
            {count}
            <button onClick={increment}>+1</button>
            <button onClick={decrement}>-1</button>
            <NormalFunction></NormalFunction>
          </div>
        );
      }}
    </CountRenderProps>
  );
}
 */
import React, { useState, useCallback } from 'react';

function CountRenderProps({ renderProps }) {
  const [count, setCount] = useState(0);

  const increment = useCallback(() => {
    setCount(count + 1);
  }, [count]);

  const decrement = useCallback(() => {
    setCount(count - 1);
  }, [count]);

  return renderProps({ count, increment, decrement });
}

function NormalFunction() {
  return [112, 12, 32];
  // return { key: 112 };
}

export default function RenderProps() {
  return (
    <CountRenderProps
      renderProps={({ count, increment, decrement }) => {
        return (
          <div>
            {count}
            <button onClick={increment}>+1</button>
            <button onClick={decrement}>-1</button>
            <NormalFunction></NormalFunction>
          </div>
        );
      }}
    ></CountRenderProps>
  );
}
