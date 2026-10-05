import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isSlaBreached } from '../../../shared/utils/format';
import type { Order, OrderStatus } from '../../../shared/types/order';
import { ordersKeys } from '../../orders/model/cache';
import type { OrdersPage } from '../../../shared/types/order';

export interface KpiSnapshot {
  ordersPerMinute: number;
  slaBreachRate: number;
  statusBreakdown: Record<OrderStatus, number>;
  sampleSize: number;
}

const EMPTY_STATUS: Record<OrderStatus, number> = {
  NEW: 0,
  PROCESSING: 0,
  PACKED: 0,
  SHIPPED: 0,
  ON_HOLD: 0,
  CANCELLED: 0,
  DELIVERED: 0,
};

function computeSnapshot(orders: Order[], eventsLastMinute: number): KpiSnapshot {
  const statusBreakdown = { ...EMPTY_STATUS };
  let breaches = 0;
  orders.forEach((order) => {
    statusBreakdown[order.status] += 1;
    if (isSlaBreached(order.slaDueAt) && order.status !== 'DELIVERED' && order.status !== 'CANCELLED') {
      breaches += 1;
    }
  });
  return {
    ordersPerMinute: eventsLastMinute,
    slaBreachRate: orders.length > 0 ? breaches / orders.length : 0,
    statusBreakdown,
    sampleSize: orders.length,
  };
}

/**
 * Derives KPIs from whatever order pages are currently cached plus a
 * rolling window of live-update timestamps, instead of a separate network
 * round-trip - the same normalized data powers both the grid and the panel.
 */
export function useKpiSnapshot() {
  const queryClient = useQueryClient();
  const eventTimestamps = useRef<number[]>([]);
  const [snapshot, setSnapshot] = useState<KpiSnapshot>(() => computeSnapshot([], 0));

  const recordEvent = useCallback(() => {
    eventTimestamps.current.push(Date.now());
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - 60_000;
      eventTimestamps.current = eventTimestamps.current.filter((t) => t > cutoff);

      const pages = queryClient.getQueriesData<OrdersPage>({ queryKey: ordersKeys.lists(), exact: false });
      const seen = new Map<string, Order>();
      pages.forEach(([, page]) => {
        page?.rows.forEach((row) => seen.set(row.id, row));
      });

      setSnapshot(computeSnapshot(Array.from(seen.values()), eventTimestamps.current.length));
    }, 1000);
    return () => clearInterval(interval);
  }, [queryClient]);

  return { snapshot, recordEvent };
}
