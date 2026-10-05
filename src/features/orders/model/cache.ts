import type { QueryClient } from '@tanstack/react-query';
import type { Order, OrdersPage, FilterState, SortState } from '../../../shared/types/order';

export const ordersKeys = {
  all: ['orders'] as const,
  lists: () => [...ordersKeys.all, 'list'] as const,
  list: (sort: SortState[], filters: FilterState, page: number) =>
    [...ordersKeys.lists(), { sort, filters, page }] as const,
  detail: (id: string) => [...ordersKeys.all, 'detail', id] as const,
};

/**
 * Adapter: patches a single order into every cached orders-list page and the
 * detail cache, so a live-stream event or a mutation result updates exactly
 * the rows that changed instead of invalidating/refetching 10k+ rows.
 */
export function patchOrderInCache(queryClient: QueryClient, order: Order): void {
  queryClient.setQueriesData<OrdersPage>({ queryKey: ordersKeys.lists(), exact: false }, (old) => {
    if (!old) return old;
    const idx = old.rows.findIndex((r) => r.id === order.id);
    if (idx === -1) return old;
    const rows = old.rows.slice();
    rows[idx] = order;
    return { ...old, rows };
  });
  queryClient.setQueryData(ordersKeys.detail(order.id), order);
}
