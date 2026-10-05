import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Route-level code splitting: each top-level page is its own chunk.
const OrdersPage = lazy(() => import('../features/orders/ui/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const NotFoundPage = lazy(() => import('./NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

export function AppRouter() {
  return (
    <Suspense fallback={<div className="op-route-loading">Loading…</div>}>
      <Routes>
        <Route path="/" element={<OrdersPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
