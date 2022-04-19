import React, { useState, useCallback } from 'react';

export default function PriceInput() {
  const [value, setValue] = useState({ amount: 0, currency: 'rmb' });
  // const value = { amount: 0, currency: 'rmb' };

  const handleChange = useCallback((value) => {
    console.log(value);
    setValue((defaultValue) => ({ ...defaultValue, ...value }));
  }, []);

  function log() {
    console.log(value);
  }

  return (
    <div>
      {console.log(value.amount)}
      {/* <input
        type="text"
        value={value.amount}
        onChange={(e) =>
          setValue((value) => ({ ...value, amount: e.target.value }))
        }
      /> */}

      <input
        type="text"
        value={value.amount}
        onChange={(e) => handleChange({ amount: e.target.value })}
      />

      {/*   <select
        value={value.currency}
        onChange={(e) =>
          setValue((value) => ({ ...value, currency: e.target.value }))
        }
      > */}
      <select
        value={value.currency}
        onChange={(e) => handleChange({ currency: e.target.value })}
      >
        <option value="rmb">rmb</option>
        <option value="dollar">dollar</option>
      </select>

      <button onClick={log}>输出</button>
    </div>
  );
}
