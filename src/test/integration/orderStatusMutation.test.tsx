import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useOrderStatusMutation } from '../../features/orders/hooks/useOrderStatusMutation';
import { ordersKeys } from '../../features/orders/model/cache';
import { orderStore } from '../../mocks/store';
import type { Order, OrdersPage } from '../../shared/types/order';

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function seedListCache(queryClient: QueryClient, order: Order) {
  const page: OrdersPage = { rows: [order], total: 1 };
  queryClient.setQueryData(ordersKeys.list([], {}, 1), page);
}

/** Finds a seeded order that can legally move NEW -> PROCESSING for a clean success-path test. */
function findNewOrder(): Order {
  const order = orderStore.list().find((o) => o.status === 'NEW');
  if (!order) throw new Error('No NEW order found in seed data');
  return order;
}

describe('useOrderStatusMutation (integration, MSW)', () => {
  it('applies an optimistic update immediately, then keeps it on success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const order = findNewOrder();
    seedListCache(queryClient, order);

    const { result } = renderHook(() => useOrderStatusMutation(), { wrapper: wrapper(queryClient) });

    result.current.mutate({ order, nextStatus: 'PROCESSING' });

    // Optimistic update should be visible synchronously (before the mocked network resolves).
    await waitFor(() => {
      const page = queryClient.getQueryData<OrdersPage>(ordersKeys.list([], {}, 1));
      expect(page?.rows[0]?.status).toBe('PROCESSING');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const page = queryClient.getQueryData<OrdersPage>(ordersKeys.list([], {}, 1));
    expect(page?.rows[0]?.status).toBe('PROCESSING');
    expect(page?.rows[0]?.version).toBe(order.version + 1);
  });

  it('rolls back the optimistic update and surfaces a conflict error on version mismatch', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const order = findNewOrder();
    seedListCache(queryClient, order);

    const { result } = renderHook(() => useOrderStatusMutation(), { wrapper: wrapper(queryClient) });

    // Use a stale version so the mock server returns 409 CONFLICT.
    result.current.mutate({ order: { ...order, version: order.version + 99 }, nextStatus: 'PROCESSING' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('CONFLICT');

    const page = queryClient.getQueryData<OrdersPage>(ordersKeys.list([], {}, 1));
    // Rolled back to the original pre-mutation snapshot.
    expect(page?.rows[0]?.status).toBe(order.status);
    expect(page?.rows[0]?.version).toBe(order.version);
  });
});
