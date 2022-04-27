import React, { useMemo } from 'react';
import { useObservable } from 'rxjs-hooks';
import { interval } from 'rxjs';

export default function RxJSHooks() {
  const numbers$ = useMemo(() => interval(1000), []);

  const count = useObservable(() => numbers$);

  return <div>{count}</div>;
}
