import React from 'react';

function Good() {
  return (
    <div>good</div>
  );
}

export default function a() {
  const obj = { good: Good };
  return (
    <div><obj.good></obj.good></div>
  );
}
