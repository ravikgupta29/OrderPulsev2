import { http, HttpResponse } from 'msw';
import { orderStore } from './store';
import type { OrderStatus } from '../shared/types/order';

/**
 * REST handlers backing the Orders API. Sorting/filtering happen server-side
 * (in-memory) just like a real backend would, so the client only ever
 * requests the page/slice it needs.
 */
export const handlers = [
  http.get('/api/orders', ({ request }) => {
    const url = new URL(request.url);
    const sortParam = url.searchParams.get('sort');
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '200');

    let rows = orderStore.list();

    // Multi-column filters: f_<column>=value
    url.searchParams.forEach((value, key) => {
      if (!key.startsWith('f_') || !value) return;
      const column = key.slice(2);
      const needle = value.toLowerCase();
      rows = rows.filter((row) => {
        const raw = (row as unknown as Record<string, unknown>)[column];
        return String(raw ?? '').toLowerCase().includes(needle);
      });
    });

    if (sortParam) {
      const sorts = sortParam.split(',').filter(Boolean).map((token) => ({
        id: token.startsWith('-') ? token.slice(1) : token,
        desc: token.startsWith('-'),
      }));
      rows = [...rows].sort((a, b) => {
        for (const sort of sorts) {
          const av = (a as unknown as Record<string, unknown>)[sort.id];
          const bv = (b as unknown as Record<string, unknown>)[sort.id];
          if (av === bv) continue;
          if (av === undefined || av === null) return sort.desc ? -1 : 1;
          if (bv === undefined || bv === null) return sort.desc ? 1 : -1;
          const comparable =
            typeof av === 'number' && typeof bv === 'number' ? av > bv : String(av) > String(bv);
          const cmp = comparable ? 1 : -1;
          return sort.desc ? -cmp : cmp;
        }
        return 0;
      });
    }

    const total = rows.length;
    const start = (page - 1) * pageSize;
    const paged = rows.slice(start, start + pageSize);

    return HttpResponse.json({ rows: paged, total });
  }),

  http.get('/api/orders/:id', ({ params }) => {
    const order = orderStore.get(String(params.id));
    if (!order) return HttpResponse.json({ message: 'Order not found' }, { status: 404 });
    return HttpResponse.json(order);
  }),

  http.patch('/api/orders/:id/status', async ({ params, request }) => {
    const body = (await request.json()) as { status: OrderStatus; version: number };
    try {
      const updated = orderStore.transition(String(params.id), body.status, body.version);
      return HttpResponse.json(updated);
    } catch (err) {
      const e = err as { kind: string; message?: string; current?: unknown };
      if (e.kind === 'CONFLICT') {
        return HttpResponse.json(
          { message: 'This order was changed by someone else. Refresh and try again.', current: e.current },
          { status: 409 },
        );
      }
      if (e.kind === 'RULE_ERROR') {
        return HttpResponse.json({ message: e.message }, { status: 422 });
      }
      return HttpResponse.json({ message: 'Order not found' }, { status: 404 });
    }
  }),

  http.post('/api/orders/:id/notes', async ({ params, request }) => {
    const body = (await request.json()) as { body: string };
    const updated = orderStore.addNote(String(params.id), body.body);
    return HttpResponse.json(updated);
  }),
];
