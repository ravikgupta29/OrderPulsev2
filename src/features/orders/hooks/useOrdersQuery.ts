import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../api/ordersApi';
import { ordersKeys } from '../model/cache';
import type { FilterState, SortState } from '../../../shared/types/order';

export function useOrdersQuery(sort: SortState[], filters: FilterState, page: number) {
  return useQuery({
    queryKey: ordersKeys.list(sort, filters, page),
    queryFn: ({ signal }) => ordersApi.fetchOrders({ sort, filters, page, signal }),
    placeholderData: (prev) => prev,
    staleTime: 10_000,
  });
}

export function useOrderQuery(id: string | null) {
  return useQuery({
    queryKey: ordersKeys.detail(id ?? ''),
    queryFn: ({ signal }) => ordersApi.fetchOrder(id as string, signal),
    enabled: Boolean(id),
  });
}
