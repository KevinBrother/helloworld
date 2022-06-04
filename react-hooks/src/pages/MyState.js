import React from 'react';
import { useState } from '../hooks/useState';

export default function MyState() {
  const [value, setValue] = useState(1);
  console.log(
    '%c [ value ]-6',
    'font-size:13px; background:pink; color:#bf2c9f;',
    value
  );
  return (
    <div>
      <div>MyState {value}</div>

      <button
        onClick={() => {
          setValue(value + 1);
        }}
      >
        add
      </button>
    </div>
  );
}
