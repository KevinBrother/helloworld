import React from 'react';
import useDrag from '../hooks/useDrag';

const style = {
  width: '150px',
  height: '150px',
  borderRadius: '50%',
  backgroundColor: 'skyBlue'
};

export default function Drag() {
  const [positionRef, position] = useDrag();

  return (
    <div>
      <div
        ref={positionRef}
        style={{
          ...style,
          transform: `translate(${position.currentX}px, ${position.current.y}px)`
        }}
      ></div>
    </div>
  );
}
