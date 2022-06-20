import { useEffect, useState } from 'react';

export function useRequest(action, params) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState();

  const reload = function () {};
  useEffect(() => {
    action(params)
      .then((rst) => {
        setData(rst);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { loading, reload, data };
}
