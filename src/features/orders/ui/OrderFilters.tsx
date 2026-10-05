import { useEffect, useState, type FormEvent } from 'react';
import type { FilterState } from '../../../shared/types/order';
import { Button } from '../../../components/Button';

const FILTERABLE_COLUMNS: Array<{ id: string; label: string }> = [
  { id: 'id', label: 'Order ID' },
  { id: 'customerName', label: 'Customer' },
  { id: 'status', label: 'Status' },
  { id: 'priority', label: 'Priority' },
  { id: 'region', label: 'Region' },
];

export function OrderFilters({ filters, onChange }: { filters: FilterState; onChange: (next: FilterState) => void }) {
  const [draft, setDraft] = useState<FilterState>(filters);

  // Keep the draft in sync when the active filters change externally (e.g.
  // browser back/forward navigation updating the URL, or another part of
  // the app clearing filters) so the inputs never show stale values.
  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onChange(draft);
  }

  function handleClear() {
    setDraft({});
    onChange({});
  }

  return (
    <form className="op-filters" onSubmit={handleSubmit} aria-label="Filter orders">
      {FILTERABLE_COLUMNS.map((col) => (
        <label className="op-filters__field" key={col.id}>
          <span>{col.label}</span>
          <input
            type="text"
            value={draft[col.id] ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, [col.id]: e.target.value }))}
          />
        </label>
      ))}
      <div className="op-filters__actions">
        <Button type="submit" variant="primary">
          Apply filters
        </Button>
        <Button type="button" variant="ghost" onClick={handleClear}>
          Clear
        </Button>
      </div>
    </form>
  );
}
