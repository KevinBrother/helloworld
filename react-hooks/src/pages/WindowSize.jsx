import React from 'react';
import useWindowSize from '../hooks/useWindowSize';

export default function WindowSize() {
  const [size] = useWindowSize();

  return (
    <>
      {console.log('window size render')}
      <div>{size > 500 ? `${size} is larger` : `${size} is smaller`}</div>
    </>
  );
}
