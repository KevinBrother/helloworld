import React, { useEffect } from 'react';

import { Observable } from 'rxjs';

export default function First() {
  var observable = Observable.create(function (observer) {
    observer.next('jerry');
    observer.next('Anna');
  });

  // 订阅observable
  observable.subscribe(function (value) {
    console.log(value);
  });

  return <div>rx</div>;
}
