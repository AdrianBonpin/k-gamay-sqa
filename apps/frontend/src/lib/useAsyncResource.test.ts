import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAsyncResource } from './useAsyncResource';

describe('useAsyncResource', () => {
  it('resolves data and clears loading', async () => {
    const fetcher = vi.fn(async (_signal: AbortSignal) => 'hello');
    const { result } = renderHook(() => useAsyncResource(fetcher, []));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe('hello');
    expect(result.current.error).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('rejects with error message', async () => {
    const fetcher = vi.fn(async (_signal: AbortSignal) => {
      throw new Error('boom');
    });
    const { result } = renderHook(() => useAsyncResource(fetcher, []));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('boom');
    expect(result.current.data).toBeNull();
  });

  it('aborts in-flight request on unmount', async () => {
    let receivedSignal: AbortSignal | null = null;
    const fetcher = vi.fn(
      (signal: AbortSignal) =>
        new Promise<string>((resolve) => {
          receivedSignal = signal;
          signal.addEventListener('abort', () => resolve('never-applied'));
          // never resolves on its own
        }),
    );
    const { result, unmount } = renderHook(() => useAsyncResource(fetcher, []));
    expect(result.current.loading).toBe(true);
    unmount();
    expect(receivedSignal).not.toBeNull();
    expect(receivedSignal!.aborted).toBe(true);
  });

  it('refetch re-runs the fetcher with a fresh signal', async () => {
    let calls = 0;
    const fetcher = vi.fn(async (_signal: AbortSignal) => {
      calls += 1;
      return `call-${calls}`;
    });
    const { result } = renderHook(() => useAsyncResource(fetcher, []));
    await waitFor(() => expect(result.current.data).toBe('call-1'));
    act(() => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.data).toBe('call-2'));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
