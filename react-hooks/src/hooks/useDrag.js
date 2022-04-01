import { useState, useEffect, useRef, useLayoutEffect } from 'react';

export default function useDrag() {
  const [, forceUpdate] = useState({});

  const positionRef = useRef({
    currentX: 0,
    currentY: 0,
    lastX: 0,
    lastY: 0
  });
  const domRef = useRef(null);

  useLayoutEffect(() => {
    let startX, startY;

    const start = (event) => {
      // console.log('start event: ', event);
      // const { clientX, clientY } = event.touches[0];
      const { clientX, clientY } = event.targeTouches[0];
      startX = clientX;
      startY = clientY;

      domRef.current.addEventListener('touchmove', move);
      domRef.current.addEventListener('touchend', end);
    };
    const move = (event) => {
      // console.log('move event: ', event);
      const { clientX, clientY } = event.targeTouches[0];
      const { lastX, lastY } = positionRef.current;
      positionRef.current.currentX = lastX + (clientX - startX);
      positionRef.current.currentY = lastY + (clientY - startY);

      forceUpdate({});
    };
    const end = (event) => {
      const { clientX, clientY } = event.targeTouches[0];
      positionRef.current.lastX = clientX;
      positionRef.current.lastY = clientY;
    };

    console.log(domRef);
    domRef.current.addEventListener('touchstart', start);
  }, []);

  return [domRef, positionRef];
}
