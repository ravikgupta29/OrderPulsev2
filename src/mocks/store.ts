import type { Order, OrderStatus } from '../shared/types/order';
import { getSeedOrders } from './seed';

/**
 * In-memory mock "database". Mutated by MSW handlers (actions) and read by
 * both the REST handlers and the live-stream simulator, so the two stay in
 * sync the same way a real API + event bus would.
 */
class OrderStore {
  private orders = new Map<string, Order>();
  private orderIds: string[];

  constructor() {
    getSeedOrders().forEach((order) => this.orders.set(order.id, order));
    this.orderIds = Array.from(this.orders.keys());
  }

  list(): Order[] {
    return Array.from(this.orders.values());
  }

  get(id: string): Order | undefined {
    return this.orders.get(id);
  }

  /** Applies a status transition with optimistic-concurrency + simple business rules. */
  transition(id: string, nextStatus: OrderStatus, expectedVersion: number): Order {
    const order = this.orders.get(id);
    if (!order) {
      throw { kind: 'NOT_FOUND' as const };
    }
    if (order.version !== expectedVersion) {
      throw { kind: 'CONFLICT' as const, current: order };
    }
    if (!isTransitionAllowed(order.status, nextStatus)) {
      throw { kind: 'RULE_ERROR' as const, message: `Cannot move order from ${order.status} to ${nextStatus}.` };
    }

    const updated: Order = {
      ...order,
      status: nextStatus,
      version: order.version + 1,
      updatedAt: new Date().toISOString(),
      timeline: [
        ...order.timeline,
        { id: `${id}-evt-${order.timeline.length}`, status: nextStatus, at: new Date().toISOString() },
      ],
    };
    this.orders.set(id, updated);
    return updated;
  }

  addNote(id: string, body: string, author = 'agent'): Order {
    const order = this.orders.get(id);
    if (!order) throw { kind: 'NOT_FOUND' as const };
    const updated: Order = {
      ...order,
      notes: [...order.notes, { id: `${id}-note-${order.notes.length}`, author, body, createdAt: new Date().toISOString() }],
    };
    this.orders.set(id, updated);
    return updated;
  }

  /** Picks a random subset of orders and nudges their status, simulating backend activity. */
  simulateRandomUpdates(count: number): Order[] {
    const ids = this.orderIds;
    const touched: Order[] = [];
    for (let i = 0; i < count; i += 1) {
      const id = ids[Math.floor(Math.random() * ids.length)];
      if (!id) continue;
      const order = this.orders.get(id);
      if (!order) continue;
      const next = nextRandomStatus(order.status);
      if (!next) continue;
      try {
        touched.push(this.transition(id, next, order.version));
      } catch {
        // ignore rule violations during random simulation
      }
    }
    return touched;
  }
}

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['PROCESSING', 'ON_HOLD', 'CANCELLED'],
  PROCESSING: ['PACKED', 'ON_HOLD', 'CANCELLED'],
  PACKED: ['SHIPPED', 'ON_HOLD'],
  ON_HOLD: ['PROCESSING', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  CANCELLED: [],
  DELIVERED: [],
};

export function isTransitionAllowed(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

function nextRandomStatus(status: OrderStatus): OrderStatus | null {
  const options = ALLOWED_TRANSITIONS[status];
  if (!options || options.length === 0) return null;
  return options[Math.floor(Math.random() * options.length)] ?? null;
}

export const orderStore = new OrderStore();
