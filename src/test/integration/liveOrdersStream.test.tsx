import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveOrdersStream } from '../../features/orders/hooks/useLiveOrdersStream';
import { MockOrderStream } from '../../mocks/stream';

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

/** Test-only escape hatch: TS `private` is compile-time only, so we can
 * trigger the stream's internal close notification deterministically
 * instead of waiting for its randomized disconnect timer. */
function forceClose(stream: MockOrderStream) {
  (stream as unknown as { emitClose: () => void }).emitClose();
}

describe('useLiveOrdersStream (integration)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('connects on mount and moves to reconnecting then back to open after a forced disconnect', async () => {
    const queryClient = new QueryClient();
    const stream = new MockOrderStream();
    const { result } = renderHook(() => useLiveOrdersStream(undefined, stream), { wrapper: wrapper(queryClient) });

    expect(result.current.status).toBe('open');

    act(() => {
      forceClose(stream);
    });
    expect(result.current.status).toBe('reconnecting');
    expect(result.current.reconnectAttempt).toBe(1);

    // Advance past the worst-case backoff delay so the hook reconnects.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(result.current.status).toBe('open');
  });

  it('marks data as stale when no events arrive for longer than the stale threshold', async () => {
    const queryClient = new QueryClient();
    const stream = new MockOrderStream();
    // Stub out the periodic tick so only the explicit emit below drives
    // `lastEventAt` - otherwise the real 1s tick loop would keep refreshing
    // it and the stream would never appear stale within the test window.
    (stream as unknown as { connect: () => void }).connect = () => {};
    const { result } = renderHook(() => useLiveOrdersStream(undefined, stream), { wrapper: wrapper(queryClient) });

    act(() => {
      (stream as unknown as { emit: (e: unknown) => void }).emit({ type: 'HEARTBEAT', seq: 1 });
    });
    expect(result.current.isStale).toBe(false);
    expect(result.current.lastEventAt).not.toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_500);
    });
    expect(result.current.isStale).toBe(true);
  });
});
