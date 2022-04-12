import { useEffect, useState } from 'react';

function getWindowSize() {
  return window.innerWidth;
}

export default function useWindowSize() {
  const [size, setSize] = useState(getWindowSize());

  useEffect(() => {
    function handleResize() {
      setSize(getWindowSize);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  /*     useEffect(() => {
      console.log('[ window -resize ] >');
      function handleResize() {
        setSize(getWindowSize);
      }

      window.addEventListener('resize', handleResize);

      return window.addEventListener('resize', handleResize);
    }, []);
 */

  return [size];
}
