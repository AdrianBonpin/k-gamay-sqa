import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { extractError } from '@/api/client';

export interface AsyncResource<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

/**
 * useAsyncResource - declarative async data fetching with AbortController.
 *
 * The fetcher receives an AbortSignal so it can cancel in-flight axios/fetch
 * requests on unmount or when deps change. Internal version counter guards
 * against stale resolutions.
 */
export function useAsyncResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
): AsyncResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tick, setTick] = useState(0);
  const versionRef = useRef(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const myVersion = ++versionRef.current;
    setLoading(true);

    fetcher(controller.signal)
      .then((result) => {
        if (myVersion !== versionRef.current) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (myVersion !== versionRef.current) return;
        if (controller.signal.aborted) return;
        if (axios.isCancel?.(err)) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if ((err as { name?: string })?.name === 'CanceledError') return;
        setError(extractError(err, 'Request failed'));
      })
      .finally(() => {
        if (myVersion !== versionRef.current) return;
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, error, loading, refetch };
}
