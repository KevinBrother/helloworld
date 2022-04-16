import { useState, useCallback } from 'react';

export default function useAsync(asyncFunction) {
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

  return { executer, data, error, loading };
}
