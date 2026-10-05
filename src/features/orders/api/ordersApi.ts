import { z } from 'zod';
import { api } from '../../../shared/api/client';
import { orderSchema, ordersPageSchema, type FilterState, type Order, type OrderStatus, type SortState } from '../../../shared/types/order';

export interface FetchOrdersParams {
  sort: SortState[];
  filters: FilterState;
  page: number;
  pageSize?: number;
  signal?: AbortSignal;
}

function buildQuery(params: FetchOrdersParams): string {
  const search = new URLSearchParams();
  if (params.sort.length > 0) {
    search.set('sort', params.sort.map((s) => `${s.desc ? '-' : ''}${s.id}`).join(','));
  }
  Object.entries(params.filters).forEach(([key, value]) => {
    if (value) search.set(`f_${key}`, value);
  });
  search.set('page', String(params.page));
  search.set('pageSize', String(params.pageSize ?? 200));
  return search.toString();
}

export const ordersApi = {
  fetchOrders: (params: FetchOrdersParams) =>
    api.get(`/orders?${buildQuery(params)}`, ordersPageSchema, params.signal),

  fetchOrder: (id: string, signal?: AbortSignal) => api.get(`/orders/${id}`, orderSchema, signal),

  updateStatus: (id: string, status: OrderStatus, version: number) =>
    api.patch(`/orders/${id}/status`, orderSchema, { status, version }),

  addNote: (id: string, body: string) => api.post(`/orders/${id}/notes`, orderSchema, { body }),
};

export const orderUpdatedEventSchema = z.object({
  type: z.literal('ORDER_UPDATED'),
  order: orderSchema,
  seq: z.number(),
});

export type { Order };
