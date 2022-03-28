import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();

  function forward() {
    navigate(1);
  }
  function back() {
    navigate(-1);
  }

  return (
    <div>
      <h1>header</h1>
      <button onClick={back}>back</button>
      <button onClick={forward}>forward</button>
    </div>
  );
}
