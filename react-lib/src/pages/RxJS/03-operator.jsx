import React from 'react';
import { interval, startWith, take } from 'rxjs';

export default function Operator() {
  interval(1000)
    .pipe(startWith(666), take(5))
    .subscribe((res) => console.log(res));
  return <div>03-operator</div>;
}
