import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../api/ordersApi';
import { ordersKeys, patchOrderInCache } from '../model/cache';

export function useAddOrderNote(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => ordersApi.addNote(orderId, body),
    onSuccess: (updated) => {
      patchOrderInCache(queryClient, updated);
      queryClient.invalidateQueries({ queryKey: ordersKeys.detail(orderId) });
    },
  });
}
