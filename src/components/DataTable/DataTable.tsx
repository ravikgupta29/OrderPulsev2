import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import './dataTable.css';

/**
 * Generic, virtualized table with keyboard navigation. Purely presentational:
 * it knows nothing about "orders" - callers supply column defs, rows and
 * sorting state. Sorting/filtering decisions and business rules live in the
 * calling feature, not here.
 */
export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  getRowId: (row: T) => string;
  selectedRowId?: string | null;
  onRowActivate?: (row: T) => void;
  rowHeight?: number;
  estimatedTotal?: number;
  ariaLabel: string;
}

export function DataTable<T>({
  data,
  columns,
  sorting,
  onSortingChange,
  getRowId,
  selectedRowId,
  onRowActivate,
  rowHeight = 40,
  ariaLabel,
}: DataTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    getRowId: (row) => getRowId(row),
  });

  const rows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });

  // With virtualization only rows within the overscan window are mounted, so
  // arrow-key navigation can't just look up the next row by DOM id - it may
  // not exist yet. Instead we scroll the target row into view and focus it
  // once react-virtual has actually mounted it. Using state (not a ref) for
  // the pending index means this effect only runs while a focus request is
  // actually in flight, not on every unrelated re-render (sorting changes,
  // live-stream row patches, etc.).
  const [pendingFocusIndex, setPendingFocusIndex] = useState<number | null>(null);

  useEffect(() => {
    if (pendingFocusIndex === null) return;
    let cancelled = false;
    let rafId = 0;
    const tryFocus = () => {
      if (cancelled) return;
      const el = document.getElementById(rowDomId(pendingFocusIndex));
      if (el) {
        el.focus();
        setPendingFocusIndex(null);
      } else {
        rafId = requestAnimationFrame(tryFocus);
      }
    };
    tryFocus();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [pendingFocusIndex]);

  function focusRow(index: number) {
    const clamped = Math.max(0, Math.min(rows.length - 1, index));
    const el = document.getElementById(rowDomId(clamped));
    if (el) {
      el.focus();
      return;
    }
    setPendingFocusIndex(clamped);
    virtualizer.scrollToIndex(clamped, { align: 'auto' });
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLDivElement>, index: number) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusRow(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusRow(index - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const row = rows[index];
      if (row) onRowActivate?.(row.original);
    }
  }

  function rowDomId(index: number) {
    return `op-datatable-row-${index}`;
  }

  return (
    <div className="op-datatable" role="group" aria-label={ariaLabel}>
      <div className="op-datatable__header" role="row">
        {table.getHeaderGroups().map((headerGroup) => (
          <div className="op-datatable__header-row" role="row" key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const canSort = header.column.getCanSort();
              const sortDir = header.column.getIsSorted();
              return (
                <div
                  role="columnheader"
                  key={header.id}
                  className="op-datatable__cell op-datatable__cell--header"
                  style={{ flex: header.column.columnDef.size ? `0 0 ${header.column.columnDef.size}px` : 1 }}
                >
                  {canSort ? (
                    <button
                      type="button"
                      className="op-datatable__sort-button"
                      onClick={header.column.getToggleSortingHandler()}
                      aria-sort={sortDir === 'asc' ? 'ascending' : sortDir === 'desc' ? 'descending' : 'none'}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <span aria-hidden="true" className="op-datatable__sort-indicator">
                        {sortDir === 'asc' ? '▲' : sortDir === 'desc' ? '▼' : ''}
                      </span>
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div ref={parentRef} className="op-datatable__scroll" tabIndex={-1}>
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;
            const isSelected = selectedRowId === getRowId(row.original);
            return (
              <div
                key={row.id}
                id={rowDomId(virtualRow.index)}
                role="row"
                tabIndex={0}
                aria-selected={isSelected}
                className={`op-datatable__row${isSelected ? ' op-datatable__row--selected' : ''}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onRowActivate?.(row.original)}
                onKeyDown={(e) => handleRowKeyDown(e, virtualRow.index)}
              >
                {row.getVisibleCells().map((cell) => (
                  <div
                    role="cell"
                    key={cell.id}
                    className="op-datatable__cell"
                    style={{ flex: cell.column.columnDef.size ? `0 0 ${cell.column.columnDef.size}px` : 1 }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
