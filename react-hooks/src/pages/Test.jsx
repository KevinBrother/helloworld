import React, { useState, useEffect, useLayoutEffect } from 'react';
import useTest from '../hooks/useTest';

export default function Test() {
  const [params, setParams] = useState({ name: 'lucy', age: 17 });
  const [date, setDate] = useState(0);

  // const _params = useTest({ params });

  /*   setTimeout(() => {
    setDate(new Date().toLocaleString());
  }, 100);
 */
  useEffect(() => {
    setParams({ ...params, name: 'test' + params.name });
  }, [params.age]);

  return (
    <>
      {console.log('render')}
      <div>
        {params.name}, {date}
      </div>
    </>
  );
}
