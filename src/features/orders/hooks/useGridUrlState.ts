import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortingState } from '@tanstack/react-table';
import { parseGridUrlState, serializeGridUrlState } from '../../../shared/utils/urlState';
import type { FilterState } from '../../../shared/types/order';

/**
 * Keeps sort/filter/selected-order/page in the URL so views are shareable.
 * This is the single place React Router's `useSearchParams` is touched for
 * the orders grid; everything else works with plain typed values.
 */
export function useGridUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => parseGridUrlState(searchParams), [searchParams]);

  const update = useCallback(
    (patch: Parameters<typeof serializeGridUrlState>[0]) => {
      setSearchParams((prev) => serializeGridUrlState(patch, prev), { replace: true });
    },
    [setSearchParams],
  );

  const setSorting = useCallback(
    (sorting: SortingState) => update({ sort: sorting.map((s) => ({ id: s.id, desc: s.desc })) }),
    [update],
  );

  const setFilters = useCallback((filters: FilterState) => update({ filters, page: 1 }), [update]);

  const setSelected = useCallback((id: string | null) => update({ selected: id }), [update]);

  const setPage = useCallback((page: number) => update({ page }), [update]);

  return { ...state, setSorting, setFilters, setSelected, setPage };
}
