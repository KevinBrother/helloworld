import React, { useState, useEffect } from 'react';
import useKeyPress from '../hooks/useKeyPress';

export default function Keyboard() {
  const { keycode } = useKeyPress();
  return (
    <div>
      清点击键盘
      {keycode}
    </div>
  );
}
