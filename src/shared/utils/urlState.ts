import type { FilterState, SortState } from '../types/order';

/**
 * All grid view state (sort, filters, selected order, pagination) is kept in
 * the URL so that views are shareable via a plain link. These pure helpers
 * convert between `URLSearchParams` and the typed view-state the app uses,
 * and are unit-tested in isolation from React.
 */
export interface GridUrlState {
  sort: SortState[];
  filters: FilterState;
  selected: string | null;
  page: number;
}

const SORT_KEY = 'sort';
const SELECTED_KEY = 'order';
const PAGE_KEY = 'page';
const FILTER_PREFIX = 'f_';

export function parseGridUrlState(params: URLSearchParams): GridUrlState {
  const sortParam = params.get(SORT_KEY);
  const sort: SortState[] = sortParam
    ? sortParam
        .split(',')
        .filter(Boolean)
        .map((token) => {
          const desc = token.startsWith('-');
          const id = desc ? token.slice(1) : token;
          return { id, desc };
        })
    : [];

  const filters: FilterState = {};
  params.forEach((value, key) => {
    if (key.startsWith(FILTER_PREFIX) && value) {
      filters[key.slice(FILTER_PREFIX.length)] = value;
    }
  });

  const pageRaw = Number(params.get(PAGE_KEY) ?? '1');
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  return {
    sort,
    filters,
    selected: params.get(SELECTED_KEY),
    page,
  };
}

export function serializeGridUrlState(state: Partial<GridUrlState>, base: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(base);

  if (state.sort !== undefined) {
    if (state.sort.length === 0) {
      params.delete(SORT_KEY);
    } else {
      params.set(SORT_KEY, state.sort.map((s) => `${s.desc ? '-' : ''}${s.id}`).join(','));
    }
  }

  if (state.filters !== undefined) {
    Array.from(params.keys())
      .filter((key) => key.startsWith(FILTER_PREFIX))
      .forEach((key) => params.delete(key));
    Object.entries(state.filters).forEach(([key, value]) => {
      if (value) params.set(`${FILTER_PREFIX}${key}`, value);
    });
  }

  if (state.selected !== undefined) {
    if (state.selected) {
      params.set(SELECTED_KEY, state.selected);
    } else {
      params.delete(SELECTED_KEY);
    }
  }

  if (state.page !== undefined) {
    if (state.page > 1) {
      params.set(PAGE_KEY, String(state.page));
    } else {
      params.delete(PAGE_KEY);
    }
  }

  return params;
}
