import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { mockOrderStream, orderStreamEventSchema, type MockOrderStream } from '../../../mocks/stream';
import { patchOrderInCache } from '../model/cache';
import { Backoff } from '../../../shared/utils/backoff';
import { env } from '../../../shared/env';
import type { Order } from '../../../shared/types/order';

export type StreamStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

const STALE_AFTER_MS = 8_000;

export interface LiveStreamState {
  status: StreamStatus;
  isStale: boolean;
  lastEventAt: number | null;
  reconnectAttempt: number;
}

/**
 * Subscribes to the simulated live event stream and patches only the
 * affected rows into the React Query cache (no full-table invalidate), so
 * live updates never force a full-page re-render. Owns reconnect/backoff
 * and stale detection; the mock transport (src/mocks/stream.ts) only
 * simulates a flaky connection.
 */
export function useLiveOrdersStream(onOrderUpdated?: (order: Order) => void, stream: MockOrderStream = mockOrderStream) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<LiveStreamState>({
    status: 'connecting',
    isStale: false,
    lastEventAt: null,
    reconnectAttempt: 0,
  });
  const backoffRef = useRef(
    new Backoff({ baseDelayMs: env.VITE_RECONNECT_BASE_DELAY_MS, maxDelayMs: env.VITE_RECONNECT_MAX_DELAY_MS }),
  );
  const lastSeqRef = useRef(0);
  const onOrderUpdatedRef = useRef(onOrderUpdated);
  onOrderUpdatedRef.current = onOrderUpdated;

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    function connect() {
      stream.connect();
      setState((s) => ({ ...s, status: 'open' }));
    }

    const unsubscribeMessage = stream.onMessage((raw) => {
      const parsed = orderStreamEventSchema.safeParse(raw);
      if (!parsed.success) return; // drop invalid payloads at the boundary
      const event = parsed.data;
      lastSeqRef.current = event.seq;
      backoffRef.current.reset();
      setState((s) => ({ ...s, lastEventAt: Date.now(), isStale: false, status: 'open', reconnectAttempt: 0 }));
      if (event.type === 'ORDER_UPDATED') {
        patchOrderInCache(queryClient, event.order);
        onOrderUpdatedRef.current?.(event.order);
      }
    });

    const unsubscribeClose = stream.onClose(() => {
      if (disposed) return;
      const delay = backoffRef.current.next();
      setState((s) => ({ ...s, status: 'reconnecting', reconnectAttempt: backoffRef.current.attemptCount }));
      reconnectTimer = setTimeout(() => {
        if (disposed) return;
        connect();
      }, delay);
    });

    connect();

    const staleCheck = setInterval(() => {
      setState((s) => {
        if (s.lastEventAt && Date.now() - s.lastEventAt > STALE_AFTER_MS && s.status === 'open') {
          return { ...s, isStale: true };
        }
        return s;
      });
    }, 2000);

    return () => {
      disposed = true;
      unsubscribeMessage();
      unsubscribeClose();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(staleCheck);
      stream.disconnect();
    };
  }, [queryClient, stream]);

  return state;
}
