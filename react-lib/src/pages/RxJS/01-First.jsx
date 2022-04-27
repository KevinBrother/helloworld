import React, { useEffect } from 'react';
import { fromEvent } from 'rxjs';

const useClickObservable = (fn) => {
  useEffect(() => {
    let subscription = fromEvent(document, 'click').subscribe((e) => fn(e));
    return () => subscription.unsubscribe();
  }, [fn]);
};

export default function First() {
  useClickObservable((e) => {
    console.log(e);
  });
  return <div>rx</div>;
}
