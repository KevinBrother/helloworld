import React from 'react';
import { useRequest } from 'ahooks';
function myRequest(params) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({
        data: {
          name: 'tom'
        }
      });
    }, 1000);
  });
}

export default function ToRequest() {
  console.log('[ 11111 ] >', '11111');
  const { data, loading, run } = useRequest(myRequest);
  console.log(
    '%c [ data, loading, reload ]-18',
    'font-size:13px; background:pink; color:#bf2c9f;',
    data,
    loading,
    run
  );

  return <div>ToRequest</div>;
}
