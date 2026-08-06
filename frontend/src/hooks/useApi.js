import { useState, useEffect, useCallback } from "react";

export function useApi(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchFn();
      setData(res?.data?.data ?? res?.data ?? null);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  const isEmpty = !isLoading && !error && (!data || (Array.isArray(data) && data.length === 0));

  return { data, error, isLoading, isEmpty, refetch: execute };
}
