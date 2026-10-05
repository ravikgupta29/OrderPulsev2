import type { Order, OrderNote, OrderPriority, OrderStatus, OrderTimelineEvent } from '../shared/types/order';

/** Small deterministic PRNG (mulberry32) so seeded data is reproducible across runs/tests. */
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REGIONS = ['NA-EAST', 'NA-WEST', 'EU-CENTRAL', 'EU-WEST', 'APAC', 'LATAM'];
const CHANNELS = ['WEB', 'MOBILE', 'MARKETPLACE', 'PHONE'] as const;
const STATUSES: OrderStatus[] = ['NEW', 'PROCESSING', 'PACKED', 'SHIPPED', 'ON_HOLD', 'CANCELLED', 'DELIVERED'];
const PRIORITIES: OrderPriority[] = ['LOW', 'STANDARD', 'HIGH', 'URGENT'];
const FIRST_NAMES = ['Ava', 'Liam', 'Noah', 'Emma', 'Oliver', 'Sophia', 'Mia', 'Lucas', 'Amara', 'Kenji'];
const LAST_NAMES = ['Patel', 'Garcia', 'Kim', 'Smith', 'Nguyen', 'Okafor', 'Rossi', 'Müller', 'Tanaka', 'Silva'];
const SKUS = ['SKU-1001', 'SKU-1002', 'SKU-1003', 'SKU-2001', 'SKU-2002', 'SKU-3001', 'SKU-3002', 'SKU-4001'];

export const ORDER_COUNT = 10_000;

function pick<T>(rand: () => number, arr: readonly T[]): T {
  const item = arr[Math.floor(rand() * arr.length)];
  return item as T;
}

function buildTimeline(rand: () => number, status: OrderStatus, createdAt: Date): OrderTimelineEvent[] {
  const order: OrderStatus[] = ['NEW', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'];
  const idx = Math.max(0, order.indexOf(status));
  const steps = status === 'ON_HOLD' || status === 'CANCELLED' ? order.slice(0, 2) : order.slice(0, idx + 1);
  let t = createdAt.getTime();
  const events: OrderTimelineEvent[] = steps.map((s, i) => {
    t += (5 + rand() * 20) * 60_000;
    return { id: `evt-${i}`, status: s, at: new Date(t).toISOString() };
  });
  if (status === 'ON_HOLD' || status === 'CANCELLED') {
    t += 10 * 60_000;
    events.push({ id: `evt-${events.length}`, status, at: new Date(t).toISOString() });
  }
  return events;
}

function buildOrder(rand: () => number, index: number): Order {
  const id = `ORD-${(10000 + index).toString()}`;
  const status = pick(rand, STATUSES);
  const priority = pick(rand, PRIORITIES);
  const createdAt = new Date(Date.now() - rand() * 1000 * 60 * 60 * 24 * 14);
  const updatedAt = new Date(createdAt.getTime() + rand() * 1000 * 60 * 60 * 6);
  const slaMinutes = priority === 'URGENT' ? 30 : priority === 'HIGH' ? 60 : priority === 'STANDARD' ? 240 : 480;
  const slaDueAt = new Date(createdAt.getTime() + slaMinutes * 60_000 + (rand() - 0.5) * slaMinutes * 60_000);
  const itemCount = 1 + Math.floor(rand() * 4);
  const items = Array.from({ length: itemCount }, (_, i) => ({
    sku: pick(rand, SKUS),
    name: `Item ${i + 1}`,
    quantity: 1 + Math.floor(rand() * 3),
    unitPriceCents: 500 + Math.floor(rand() * 15000),
  }));
  const totalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  const notes: OrderNote[] = rand() > 0.7 ? [
    {
      id: `${id}-note-1`,
      author: 'system',
      body: 'Address verified automatically.',
      createdAt: updatedAt.toISOString(),
    },
  ] : [];

  return {
    id,
    customerName: `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`,
    region: pick(rand, REGIONS),
    channel: pick(rand, CHANNELS),
    status,
    priority,
    totalCents,
    itemCount,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    slaDueAt: slaDueAt.toISOString(),
    version: 1,
    items,
    notes,
    timeline: buildTimeline(rand, status, createdAt),
  };
}

let cache: Order[] | null = null;

/** Lazily-built, memoized seed set of 10,000+ orders shared by MSW handlers and the live stream. */
export function getSeedOrders(): Order[] {
  if (cache) return cache;
  const rand = mulberry32(42);
  cache = Array.from({ length: ORDER_COUNT }, (_, i) => buildOrder(rand, i));
  return cache;
}

export function resetSeedOrders(): void {
  cache = null;
}
