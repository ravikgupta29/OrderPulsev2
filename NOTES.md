# NOTES.md - Design decisions, trade-offs, and what's cut

## Design patterns and why they fit

- **Custom hooks** are the primary unit of reuse: `useGridUrlState` (URL as
  the single source of truth for view state), `useOrderStatusMutation`
  (optimistic update + rollback), `useLiveOrdersStream` (reconnect/backoff +
  stale detection), `useKpiSnapshot` (derived metrics). Each hides a state
  machine behind a small, testable surface so components stay declarative.
- **Compound components** (`Drawer.Root/Header/Body/Footer`) let the shell
  own focus-trap/escape/overlay behaviour while features own content, so
  new drawer content never requires touching the Drawer implementation.
- **Adapter** (`patchOrderInCache`): both a mutation response and a stream
  event are "a new Order" from the cache's point of view; one function
  normalizes either into a single-row cache patch, avoiding a full refetch
  of 10k+ rows on every change.
- **Observer-style event bus** (`src/mocks/stream.ts`): a minimal
  pub/sub (`onMessage`/`onClose`) decouples the simulated transport from
  the reconnect/backoff policy, which lives entirely in the consuming hook.
- **Centralized permission table** (`features/authz`): `Role -> Permission[]`
  is one map; features ask `can('orders:cancel')` or render `<Can>`, so
  adding a role or a permission never means hunting for scattered
  `if (role === 'SUPERVISOR')` checks.

## State and data-fetching decisions

- **React Query** for all server state: it gives cache patching, request
  de-duplication, stale-time control and optimistic-update primitives out of
  the box, which fits the "no unnecessary re-renders on live updates"
  requirement better than hand-rolled state for this scope.
- **URL as view-state store** for sort/filters/selection/page: no Redux/zustand
  needed for UI state that only needs to be shareable and bookmarkable.
- **Optimistic updates with snapshot rollback**: `onMutate` snapshots every
  matching list page + the detail cache before patching; `onError` restores
  that exact snapshot. This was chosen over "refetch on error" because a
  refetch can't reliably show the *specific* rule/conflict message tied to
  the attempted transition.
- **Trade-off**: the mock "backend" is a single in-memory store per browser
  tab (`src/mocks/store.ts`). It is not persisted and does not model true
  multi-tab/concurrent-editor conflicts beyond the version check - enough to
  exercise the 409 rollback path, not a substitute for a real database.

## Performance

- **Virtualization** (`@tanstack/react-virtual`) renders only the rows in the
  viewport (+overscan) out of 10,000+ seeded orders; the DOM never holds more
  than a few dozen row elements regardless of dataset size.
- **Row-level cache patching** instead of query invalidation means a live
  stream event (as often as several per second) updates one row's object
  identity, not the whole list - React Query/React only re-render the
  affected row, not re-run the grid.
- **Route-level code splitting** (`React.lazy` in `app/router.tsx`) keeps the
  initial bundle for the Orders page separate from other routes.
- **What's not done**: a profiled before/after (React Profiler or Lighthouse)
  with numbers was cut for time - see "What was cut" below. The architecture
  choices above (virtualization + patch-not-invalidate) are the main levers;
  validating them with recorded numbers is the next step.

## Accessibility choices

- Grid rows are real, focusable, keyboard-operable elements (`tabIndex=0`,
  Arrow Up/Down to move, Enter/Space to open), rather than relying on mouse
  hover/click only.
- The drawer implements WAI-ARIA dialog basics by hand (no extra dependency):
  focus moves into the panel on open, Tab/Shift+Tab are trapped inside it,
  Escape closes it, and focus returns to the previously-focused element.
- One shared `aria-live="polite"` region announces live order changes and
  action outcomes; connection-state banners use `role="status"` and switch
  to `aria-live="assertive"` when the state is time-critical (disconnected,
  stale).
- A baseline automated `axe-core` check runs in CI-equivalent tests against
  the reusable component library. Full-page/Lighthouse-level colour-contrast
  auditing was out of scope for the time box (see cuts).

## How this would scale to 50 developers / several teams

- The **feature folder boundary** (`features/orders`, `features/kpi`,
  `features/authz`) is the unit a team would own; each exposes its public
  surface through an `index.ts`/`ui` barrel so other teams don't reach into
  internals.
- The **component library** (`src/components`) has zero business logic by
  construction, so it can be extracted into its own package/Storybook host
  without touching feature code.
- The **typed API layer + Zod boundary** means a backend team can change
  response shapes and the type system/tests will catch mismatches immediately
  rather than failing silently in production.
- The **permission table** is the single place to add a new role without
  touching every component that renders an action.
- Next steps for real scale: split `mocks/` behind a feature flag so it can
  be swapped for a generated API client (e.g. OpenAPI), add Storybook for the
  component library, and introduce a shared design-token/theme layer.

## What was cut for time (and why)

- **Column resize/reorder and saved views**: the grid supports sort + typed
  multi-column filters with URL persistence, but drag-to-resize/reorder and
  named "saved views" were cut - they're additive UI on top of the same URL
  state model and lower-weighted than data correctness/performance.
- **Charts library**: the KPI panel uses a minimal CSS bar chart instead of a
  charting library, to avoid adding a sizeable dependency for three metrics
  in the time available.
- **Resync-from-missed-events on reconnect**: the mock stream exposes a
  `replaySince(seq)` seam, but the client doesn't yet request a real replay
  window after reconnecting - today it relies on the next full grid fetch to
  reconcile state. A production version would replay the event log since the
  last seen sequence number.
- **Profiled before/after performance numbers**: the architectural levers
  (virtualization, patch-not-invalidate, code splitting) are in place, but
  recorded Profiler/Lighthouse numbers were not captured in this pass.
- **Stretch goals** (Web Worker filtering, Storybook, service worker, i18n,
  CI pipeline): none attempted, by design, to protect time for the
  higher-weighted core requirements (architecture, data handling,
  performance, accessibility, tests).

## Changes made to AI-generated code

This project was built with AI assistance end-to-end inside this session; see
`PROMPTS.md` for the prompt log. The most notable in-session correction: an
integration test caught a real bug where the cache-patch helper
(`patchOrderInCache`) matched too broad a React Query key prefix and crashed
when it hit the single-order detail cache instead of a list page - fixed by
scoping the patch to the `orders.list` key prefix specifically
(`src/features/orders/model/cache.ts`).
