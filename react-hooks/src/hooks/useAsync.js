import { useState, useEffect } from 'react';

export default function useAsync(url) {
  const [options, setOptions] = useState({ current: 1, pageSize: 5, url: '' });
  const { current, pageSize } = options;
  const [data, setData] = useState({ list: [], total: 10 });

  function request() {
    /*   fetch(`${url}?current=${current}&pageSize=${pageSize}`)
      .then((r) => r.json())
      .then((r) => {
        setData({
          list: r.list,
          total: r.total
        });
      }); */

    setTimeout(() => {
      const reqUrl = `${url}?current=${current}&pageSize=${pageSize}`;

      setOptions((options) => ({
        ...options,
        url: reqUrl
      }));

      setData((r) => ({
        ...r,
        list: [Math.random(), ...[r.list]]
      }));
    }, 300);
  }

  useEffect(request, [current, pageSize, setData, url]);

  return { data, options, setOptions };
}
