import { z } from 'zod';

export const orderStatusSchema = z.enum([
  'NEW',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'ON_HOLD',
  'CANCELLED',
  'DELIVERED',
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const orderPrioritySchema = z.enum(['LOW', 'STANDARD', 'HIGH', 'URGENT']);
export type OrderPriority = z.infer<typeof orderPrioritySchema>;

export const orderItemSchema = z.object({
  sku: z.string(),
  name: z.string(),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderNoteSchema = z.object({
  id: z.string(),
  author: z.string(),
  body: z.string(),
  createdAt: z.string(),
});
export type OrderNote = z.infer<typeof orderNoteSchema>;

export const orderTimelineEventSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  at: z.string(),
  note: z.string().optional(),
});
export type OrderTimelineEvent = z.infer<typeof orderTimelineEventSchema>;

export const orderSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  region: z.string(),
  channel: z.enum(['WEB', 'MOBILE', 'MARKETPLACE', 'PHONE']),
  status: orderStatusSchema,
  priority: orderPrioritySchema,
  totalCents: z.number().int().nonnegative(),
  itemCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  slaDueAt: z.string(),
  version: z.number().int().nonnegative(),
  items: z.array(orderItemSchema),
  notes: z.array(orderNoteSchema),
  timeline: z.array(orderTimelineEventSchema),
});
export type Order = z.infer<typeof orderSchema>;

export const ordersPageSchema = z.object({
  rows: z.array(orderSchema),
  total: z.number().int().nonnegative(),
});
export type OrdersPage = z.infer<typeof ordersPageSchema>;

/** Sort directive used both in the API query and the URL state. */
export interface SortState {
  id: string;
  desc: boolean;
}

/** Simple per-column filter: column id -> raw text/value typed by the user. */
export type FilterState = Record<string, string>;
