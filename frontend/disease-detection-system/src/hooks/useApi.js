import { useState, useEffect, useCallback } from 'react';

export const useApi = (apiFunction, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFunction(...args);
      // Axios response: result.data is the API JSON body
      setData(result?.data ?? null);
    } catch (err) {
      setData(null);
      setError(err.response?.data || err.message || 'An error occurred');
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  useEffect(() => {
    fetchData(...dependencies);
  }, dependencies);

  return { data, loading, error, refetch: fetchData };
};
