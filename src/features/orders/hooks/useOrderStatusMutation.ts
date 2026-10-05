import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../api/ordersApi';
import { ordersKeys, patchOrderInCache } from '../model/cache';
import type { AppError } from '../../../shared/types/error';
import type { Order, OrderStatus, OrdersPage } from '../../../shared/types/order';

interface MutationVars {
  order: Order;
  nextStatus: OrderStatus;
}

interface Snapshot {
  lists: Array<[readonly unknown[], OrdersPage | undefined]>;
  detail: Order | undefined;
}

/**
 * Mark packed / hold / cancel all funnel through this single mutation hook:
 * optimistic update first, roll back the exact snapshot on conflict or rule
 * error, and surface a typed AppError the UI can render a clear message for.
 */
export function useOrderStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation<Order, AppError, MutationVars, Snapshot>({
    mutationFn: ({ order, nextStatus }) => ordersApi.updateStatus(order.id, nextStatus, order.version),

    onMutate: async ({ order, nextStatus }) => {
      await queryClient.cancelQueries({ queryKey: ordersKeys.all });

      const snapshot: Snapshot = {
        lists: queryClient.getQueriesData<OrdersPage>({ queryKey: ordersKeys.lists(), exact: false }),
        detail: queryClient.getQueryData<Order>(ordersKeys.detail(order.id)),
      };

      const optimisticOrder: Order = {
        ...order,
        status: nextStatus,
        version: order.version + 1,
        updatedAt: new Date().toISOString(),
        timeline: [
          ...order.timeline,
          { id: `optimistic-${order.timeline.length}`, status: nextStatus, at: new Date().toISOString() },
        ],
      };
      patchOrderInCache(queryClient, optimisticOrder);

      return snapshot;
    },

    onError: (_err, _vars, snapshot) => {
      if (!snapshot) return;
      snapshot.lists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (snapshot.detail) {
        queryClient.setQueryData(ordersKeys.detail(snapshot.detail.id), snapshot.detail);
      }
    },

    onSuccess: (updated) => {
      patchOrderInCache(queryClient, updated);
    },

    onSettled: (_data, _error, { order }) => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.detail(order.id) });
    },
  });
}
