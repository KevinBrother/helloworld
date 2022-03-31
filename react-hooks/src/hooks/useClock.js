import { useState, useEffect } from 'react';

export default function useClock() {
  const [date, setDate] = useState();

  console.log('[ inner  hook ] >');

  useEffect(() => {
    console.log('[ inner  hook  useEffect] >');
    const timer = setInterval(() => setDate(new Date().toString()), 1000);
    return () => clearInterval(timer);
  });

  return date;
}
