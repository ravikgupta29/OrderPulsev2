/**
 * KPIs are derived client-side from the orders cache and live-stream
 * timestamps (see `useKpiSnapshot`) rather than fetched from a dedicated
 * endpoint. This file exists as the designated seam for a future
 * `/api/kpi/summary` endpoint so a real backend aggregation can be dropped
 * in without touching the hook's public shape.
 */
export {};
