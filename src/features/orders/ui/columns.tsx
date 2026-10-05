import type { ColumnDef } from '@tanstack/react-table';
import type { Order } from '../../../shared/types/order';
import { formatCurrency, formatRelative, isSlaBreached } from '../../../shared/utils/format';

export const orderColumns: ColumnDef<Order, unknown>[] = [
  {
    accessorKey: 'id',
    header: 'Order',
    size: 110,
  },
  {
    accessorKey: 'customerName',
    header: 'Customer',
    size: 160,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    size: 120,
    cell: ({ getValue }) => <span className={`op-status-badge op-status-badge--${String(getValue()).toLowerCase()}`}>{String(getValue())}</span>,
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    size: 100,
  },
  {
    accessorKey: 'region',
    header: 'Region',
    size: 110,
  },
  {
    accessorKey: 'totalCents',
    header: 'Total',
    size: 100,
    cell: ({ getValue }) => formatCurrency(Number(getValue())),
  },
  {
    accessorKey: 'slaDueAt',
    header: 'SLA',
    size: 130,
    cell: ({ row }) => {
      const breached = isSlaBreached(row.original.slaDueAt) && row.original.status !== 'DELIVERED' && row.original.status !== 'CANCELLED';
      return <span className={breached ? 'op-sla-breached' : undefined}>{breached ? 'Breached' : 'On track'}</span>;
    },
  },
  {
    accessorKey: 'updatedAt',
    header: 'Updated',
    size: 110,
    cell: ({ getValue }) => formatRelative(String(getValue())),
  },
];
