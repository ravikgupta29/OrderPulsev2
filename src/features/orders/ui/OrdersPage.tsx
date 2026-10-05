import { useMemo } from 'react';
import type { SortingState } from '@tanstack/react-table';
import { DataTable } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { useGridUrlState } from '../hooks/useGridUrlState';
import { useOrdersQuery } from '../hooks/useOrdersQuery';
import { useLiveOrdersStream } from '../hooks/useLiveOrdersStream';
import { orderColumns } from './columns';
import { OrderFilters } from './OrderFilters';
import { OrderDrawer } from './OrderDrawer';
import { ConnectionBanner } from './ConnectionBanner';
import { KpiPanel } from '../../kpi/ui/KpiPanel';
import { useKpiSnapshot } from '../../kpi/hooks/useKpiSnapshot';
import { useAnnouncer } from '../../../shared/a11y/useAnnouncer';
import { LiveRegion } from '../../../shared/a11y/LiveRegion';
import { useAuthz } from '../../authz';

export function OrdersPage() {
  const { sort, filters, selected, page, setSorting, setFilters, setSelected, setPage } = useGridUrlState();
  const { role, setRole } = useAuthz();
  const { announce, message } = useAnnouncer();
  const { snapshot, recordEvent } = useKpiSnapshot();

  const streamState = useLiveOrdersStream((order) => {
    recordEvent();
    if (order.id === selected) {
      announce(`Order ${order.id} updated to ${order.status.replace('_', ' ')}.`);
    }
  });

  const { data, isLoading, isError, error } = useOrdersQuery(sort, filters, page);

  const sortingState: SortingState = useMemo(() => sort.map((s) => ({ id: s.id, desc: s.desc })), [sort]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / 200)) : 1;

  return (
    <div className="op-orders-page">
      <LiveRegion message={message} />
      <header className="op-orders-page__header">
        <h1>OrderPulse</h1>
        <div className="op-role-switch">
          <label htmlFor="op-role-select">Role</label>
          <select id="op-role-select" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
            <option value="AGENT">Agent</option>
            <option value="SUPERVISOR">Supervisor</option>
          </select>
        </div>
      </header>

      <ConnectionBanner status={streamState.status} isStale={streamState.isStale} reconnectAttempt={streamState.reconnectAttempt} />

      <KpiPanel snapshot={snapshot} />

      <OrderFilters filters={filters} onChange={setFilters} />

      {isError && <p role="alert">Failed to load orders: {error instanceof Error ? error.message : 'Unknown error'}</p>}

      {isLoading && !data ? (
        <p>Loading orders…</p>
      ) : (
        <>
          <DataTable
            data={data?.rows ?? []}
            columns={orderColumns}
            sorting={sortingState}
            onSortingChange={(updater) => {
              const next = typeof updater === 'function' ? updater(sortingState) : updater;
              setSorting(next);
            }}
            getRowId={(row) => row.id}
            selectedRowId={selected}
            onRowActivate={(row) => setSelected(row.id)}
            ariaLabel="Orders"
          />
          <nav className="op-pagination" aria-label="Orders pagination">
            <Button variant="ghost" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
              Previous
            </Button>
            <span>
              Page {page} of {totalPages} ({data?.total.toLocaleString() ?? 0} orders)
            </span>
            <Button variant="ghost" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
              Next
            </Button>
          </nav>
        </>
      )}

      <OrderDrawer orderId={selected} onClose={() => setSelected(null)} onAnnounce={announce} />
    </div>
  );
}
