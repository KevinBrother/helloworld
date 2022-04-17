import { useState, useCallback, useEffect } from 'react';

export default function useAsync(asyncFunction, options = {}) {
  const { manual } = options;
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const executer = useCallback(() => {
    setLoading(true);
    asyncFunction()
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [asyncFunction]);

  useEffect(() => {
    if (manual) {
      return;
    }
    executer();
  }, [manual, executer]);

  return { executer, data, error, loading };
}
