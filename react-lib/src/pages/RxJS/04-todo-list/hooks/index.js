import { useRef } from 'react';
export const useInstance = (instanceClass) => {
  const instance = useRef(null);
  return instance.current || (instance.current = new instanceClass());
};
