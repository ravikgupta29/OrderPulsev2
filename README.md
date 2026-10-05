# OrderPulse

A live operations dashboard for a retailer's fulfilment team: a virtualized
10,000+ row orders grid, a live event stream simulation, an order detail
drawer with optimistic actions, a KPI panel, and a role-based permission
layer - built as a one-day React 18 + TypeScript (strict) assessment project.

## Quick start

```bash
npm install
npm run dev  # http://localhost:5173
```

Open the printed localhost URL. The app starts in the `int` (integration)
environment by default, with MSW mocking the API and an in-memory live
stream simulating backend activity (10k+ seeded orders, periodic status
changes, and occasional forced disconnects to exercise reconnect/backoff).

### Environments

Three `.env` files drive environment-specific configuration - no URL or flag
is hardcoded in source:

| File        | Mode    | Script                                |
| ----------- | ------- | -------------------------------------- |
| `.env.int`  | `int`   | `npm run dev:int` / `npm run build:int` |
| `.env.val`  | `val`   | `npm run dev:val` / `npm run build:val` |
| `.env.prod` | `prod`  | `npm run build:prod`                   |
| `.env`      | default | `npm run dev` (falls back to Int-like settings) |

All variables are read and runtime-validated once in `src/shared/env`
(Zod schema) - nothing else in the app touches `import.meta.env` directly.

### Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `dev:int` / `dev:val` | Start Vite dev server for a given environment |
| `npm run build` / `build:int` / `build:val` / `build:prod` | Type-check + production build |
| `npm run preview` | Preview a production build |
| `npm run lint` | ESLint (flat config, TS + React hooks + fast-refresh rules) |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm test` | Vitest unit + integration tests (jsdom, MSW, Testing Library, axe) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright end-to-end smoke test (builds + previews the app first) |

## Architecture overview

Feature-based folders, a small UI library with no business logic, and a
shared layer for cross-cutting concerns:

```
src/
  app/            providers (QueryClient, Router, Authz), router w/ lazy routes, error boundary
  components/     DataTable, Drawer, Banner, Button - presentational only
  features/
    orders/       api (typed+zod), model (cache adapter), hooks, ui
    kpi/          hooks (derived snapshot), ui (bar-chart panel)
    authz/        role -> permission table, provider, <Can> gate
  shared/
    api/          typed fetch client, validates every response with Zod
    env/          single validated entry point for environment variables
    types/        Order/OrderStatus domain schemas, AppError
    utils/        URL view-state (de)serialization, exponential backoff
    a11y/         aria-live announcer + region
  mocks/          10k+ seeded orders, MSW REST handlers, in-memory live stream simulator
```

### Data flow

1. `ordersApi` issues typed requests through `shared/api/client`, which
   validates every response against a Zod schema at the boundary and
   normalizes failures into a single `AppError` shape (`RULE_ERROR`,
   `CONFLICT`, `NETWORK`, `VALIDATION`, `NOT_FOUND`, `UNKNOWN`).
2. React Query owns server state (`useOrdersQuery`, `useOrderQuery`). All
   grid view state - sort, multi-column filters, selected order, page - is
   kept in the URL via `useGridUrlState`, so any view is shareable as a link.
3. Status-changing actions (mark packed / hold / cancel) go through
   `useOrderStatusMutation`: an optimistic cache patch is applied in
   `onMutate`, with a snapshot restored in `onError` on conflict (409) or
   rule violation (422).
4. `src/mocks/stream.ts` simulates a live SSE/event-bus feed in-memory
   (sequenced events, heartbeats, random disconnects). `useLiveOrdersStream`
   owns reconnect/backoff (via `shared/utils/backoff`) and stale detection,
   and patches only the affected row into the cache (`patchOrderInCache`)
   instead of invalidating the whole 10k-row list.
5. KPIs (`useKpiSnapshot`) are derived from whatever order pages are
   currently cached plus a rolling window of live-event timestamps - no
   separate KPI network round-trip.
6. `features/authz` is the single source of truth mapping `Role` ->
   `Permission[]`; UI code calls `useAuthz().can(...)` or wraps elements in
   `<Can permission="...">` instead of branching on role.

### Patterns used on purpose

- **Custom hooks** encapsulate every non-trivial behaviour (`useGridUrlState`,
  `useOrderStatusMutation`, `useLiveOrdersStream`, `useKpiSnapshot`), keeping
  components declarative.
- **Compound components**: `Drawer.Root / Header / Body / Footer` share
  context (close handler, focus trap) without the shell knowing about order
  details, notes or actions.
- **Adapter**: `patchOrderInCache` normalizes both mutation responses and
  stream events into the same cache-patch operation.
- **Observer-ish event bus**: the mock stream publishes events to any number
  of subscribers (`onMessage`/`onClose`), decoupled from how the UI reacts.

## Testing

- **Unit** (`src/test/unit`): permission table, URL view-state
  (de)serialization, exponential backoff with jitter.
- **Integration** (`src/test/integration`, MSW + Testing Library): optimistic
  status mutation success path and the conflict/rollback path; a baseline
  automated axe accessibility check on `Banner`/`Button`/`Drawer`.
- **End-to-end** (`e2e/`, Playwright): loads the grid, applies a filter
  (asserting the URL updates), opens the drawer, runs an action, and closes
  it with the keyboard.

Run everything:

```bash
npm test          # unit + integration
npm run test:e2e  # Playwright (installs/launches Chromium automatically)
```

## Accessibility baseline

- Grid rows are focusable and support Arrow Up/Down + Enter/Space.
- The drawer is a proper dialog: focus moves in on open, is trapped with
  Tab/Shift+Tab, Escape closes it, and focus returns to the triggering
  element on close.
- A single `aria-live="polite"` region (`shared/a11y`) announces live order
  updates and action results instead of ad-hoc live regions per feature.
- Connection/staleness banners use `role="status"` with `aria-live` set to
  `assertive` for anything time-critical (disconnect, stale data).

## What's documented elsewhere

- `NOTES.md` - design decisions, trade-offs, and what was cut for time.
- `PROMPTS.md` - the AI prompt log for this project.
