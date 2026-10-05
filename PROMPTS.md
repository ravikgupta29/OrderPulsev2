PROMPTS.md - AI prompt log
This file lists, in order, the prompts used to scope and build OrderPulse.
Earlier prompts (planning/discussion) happened in a prior chat session; the
entries below cover the session that generated the actual repository
scaffold and code.
Implement the OrderPulse mock database.
The mock database must behave like an in-memory backend database and must not be coupled to React components.
Create an Order domain model containing at least:
id
customerName
region
channel
status
priority
totalCents
itemCount
createdAt
updatedAt
slaDueAt
version
items
notes
timeline
Create realistic order statuses such as:
NEW
PROCESSING
PACKED
SHIPPED
DELIVERED
ON_HOLD
CANCELLED
Create appropriate:
OrderItem
OrderNote
OrderTimelineEvent

Generate 10,000 deterministic orders.
Use a seeded random generator so the same application startup produces reproducible mock data.
2.Implement a mock backend using Mock Service Worker.
The mock backend must sit between the frontend API client and the in-memory OrderStore.
Configure MSW to intercept:
GET /api/orders
GET /api/orders/:id
PATCH /api/orders/:id/status
POST /api/orders/:id/notes
Return appropriate HTTP errors:
400
404
409
422
500
The mock backend should behave as closely as possible to a real REST backend.
3.Create a centralized typed API client.
The client should provide reusable methods:
get()
post()
patch()
The client must:
Read VITE_API_BASE_URL.
Build URLs safely.
Use fetch.
Support AbortSignal.
Parse JSON responses.
Handle HTTP errors.
Convert backend errors into a common AppError.
Support typed responses.
Never expose raw fetch logic to React components.
Create:
AppError
with categories such as:
NETWORK
NOT_FOUND
CONFLICT
VALIDATION
RULE_ERROR
UNKNOWN
4.Add Zod validation at the API boundary.
Create schemas for:
Order
OrderItem
OrderNote
OrderTimelineEvent
OrdersPage
OrderStatusUpdateRequest
AddOrderNoteRequest
OrderStreamEvent
The API client or feature API must validate backend responses using Zod before returning them to React Query.
5.Implement:
fetchOrders()
fetchOrder()
updateOrderStatus()
addOrderNote()
The API layer must use the shared API client.
Do not use fetch directly inside this file.
The API should accept typed parameters.
6.Implement TanStack React Query for all server state.
Create:
src/features/orders/hooks/
├── useOrdersQuery.ts
├── useOrderQuery.ts
├── useOrderStatusMutation.ts
└── useAddOrderNote.ts
Configure an application-level QueryClient.
Create stable query keys.
For example:
orders
orders list
order detail
The list query key must include:
page
pageSize
filters
sort
search
so different views do not incorrectly share cached data.
7.Create:
src/features/orders/hooks/useGridUrlState.ts
The browser URL must be the source of truth for grid/view state.
Support:
page
sort
filters
selected order
The hook should provide:
state
setSort()
setFilter()
setPage()
setSelectedOrder()
clearFilters()
Changing filters should reset the page to 1.
Do not duplicate URL state in unnecessary React local state.
8.Create reusable UI components before building the Orders screen.
Create:
src/components/ui/
Implement:
Button
Badge
Input
Select
Checkbox
Drawer
Modal
Tabs
Tooltip
Spinner
EmptyState
ErrorState
Pagination
ConnectionBanner
Create a generic DataTable.
The DataTable must not know about orders.
It should accept:
data
columns
sorting
selection
loading
empty state
row events
Use:
TanStack Table
TanStack Virtual
for table state and virtualization.
The component must be reusable for other domains.
Do not put business rules such as:
if order.status === ...
inside the generic DataTable.
9.Create:
src/features/orders/ui/OrderFilters.tsx
Support filtering by:
status
region
channel
priority
search
10.Define order-specific columns:
Order ID
Customer
Region
Channel
Status
Priority
Items
Total
Created
Updated
SLA
Use the generic DataTable.
11.Create the main OrdersPage.
It should compose:
Header
KpiPanel
ConnectionBanner
OrderFilters
OrdersTable
Pagination
OrderDrawer
OrdersPage is the feature composition/orchestration layer.
It should connect:
useGridUrlState
useOrdersQuery
useLiveOrdersStream
useKpiSnapshot
The component should not contain low-level API logic.
12.Create an OrderDrawer that opens when an order is selected.
Selection must be represented in the URL:
?order=ORD-10001
Use:
useOrderQuery(orderId)
to retrieve detail information.
Display:
Order information
Customer
Items
Status
Priority
Timeline
Notes
Actions
The drawer should use the generic Drawer component.
13.Create:
src/features/orders/model/cache.ts
Implement utilities such as:
patchOrderInCache()
getOrderFromCache()
updateOrderInAllListCaches()
updateOrderDetailCache()
When an order changes, update all relevant React Query caches.
14.Implement a live order event architecture.
Create:
src/features/orders/hooks/useLiveOrdersStream.ts
src/features/orders/model/stream.ts
Create an abstraction such as:
OrderStream
It should support:
connect()
disconnect()
subscribe()
Events should contain:
sequence number
event type
order
timestamp
Validate every incoming event using Zod.
15.Create a development mock stream.
Create:
src/mocks/stream.ts
The mock stream should periodically generate realistic order updates.
16.Implement KPI calculations using React Query order cache and live event information.
Create:
src/features/kpi/
├── hooks/
├── model/
├── ui/
└── api/
Initially derive KPIs from frontend state.
Display:
Orders/minute
SLA breach rate
Status breakdown
Orders tracked
The KPI layer should be isolated so it can later switch to a real backend API.
17.Add proper UX states to the Orders application.
Support:
Initial loading
Table loading
Pagination loading
Order detail loading
Mutation loading
Empty result
Network error
Backend error
Stream disconnected
Stream reconnecting
Stale data
The UI should never show a blank screen while waiting for data.
Use reusable components where possible.
18.Implement server-side pagination.
The API must receive:
page
pageSize
The UI must display:
current page
total pages
next
previous
first
last
Changing page should update the URL.
19.Review the entire Orders application for frontend performance.
Verify:
React Query caching
query key stability
table virtualization
memoized columns
unnecessary renders
unnecessary API requests
stale query handling
pagination
optimistic cache updates
live event cache updates
Use React DevTools or appropriate profiling techniques if available.
Do not add memoization everywhere blindly.
Only optimize actual expensive render paths.
20.Add comprehensive testing.
Implement:
Unit tests
Test:
seed generator
OrderStore
filters
sorting
pagination
Zod schemas
cache utilities
permissions
KPI calculations
Integration tests
Test:
OrdersPage
API + MSW
React Query
filtering
pagination
order selection
mutations
optimistic updates
conflict handling
E2E tests
Notes on how prompts were used
Total 20 Prompt (the detailed requirements list) was treated as the authoritative
scope for this session and implemented directly: project scaffolding,
feature-based architecture, mocks (10k+ seeded orders + live stream
simulation), optimistic actions with rollback, URL-synced grid state, a
permission layer, accessibility basics, and the test pyramid (unit,
integration, e2e, axe).
No additional mid-session clarifying prompts were required; ambiguous
points (e.g., exact KPI chart styling, saved-view persistence) were
resolved in favour of the higher-weighted requirements and recorded as
explicit cuts in `NOTES.md`.