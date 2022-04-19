import React, { useState, useEffect } from 'react';

export default function useKeyPress(dom = document.body, length = 2) {
  const [keycode, setKeycode] = useState([]);

  useEffect(() => {
    function handleKeyCode(e) {
      const keyCode = e.keyCode;

      setKeycode((preValue) => {
        if (preValue.length < length) {
          return [...preValue, keyCode];
        } else {
          setKeycode([keyCode]);
        }
      });
    }
    dom.addEventListener('keypress', handleKeyCode);
    return () => {
      dom.removeEventListener('keypress', handleKeyCode);
    };
  }, [dom, length]);

  return { keycode };
}
