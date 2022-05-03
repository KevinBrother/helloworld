import React from 'react';
import './index.less';

export function PasswordLevel() {
  return (
    <meter
      className="password-meter"
      value="6"
      min="0"
      low="4"
      high="8"
      optimum="10"
      max="12"
    ></meter>
  );
}
