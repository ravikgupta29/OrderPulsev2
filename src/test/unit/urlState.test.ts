import { describe, expect, it } from 'vitest';
import { parseGridUrlState, serializeGridUrlState } from '../../shared/utils/urlState';

describe('grid URL state', () => {
  it('parses sort, filters, selection and page from search params', () => {
    const params = new URLSearchParams('sort=-updatedAt,status&f_status=HOLD&f_region=APAC&order=ORD-1021&page=3');
    const state = parseGridUrlState(params);

    expect(state.sort).toEqual([
      { id: 'updatedAt', desc: true },
      { id: 'status', desc: false },
    ]);
    expect(state.filters).toEqual({ status: 'HOLD', region: 'APAC' });
    expect(state.selected).toBe('ORD-1021');
    expect(state.page).toBe(3);
  });

  it('defaults to an empty, page-1 state when no params are present', () => {
    const state = parseGridUrlState(new URLSearchParams());
    expect(state).toEqual({ sort: [], filters: {}, selected: null, page: 1 });
  });

  it('round-trips through serialize -> parse', () => {
    const original = new URLSearchParams();
    const serialized = serializeGridUrlState(
      { sort: [{ id: 'priority', desc: true }], filters: { status: 'NEW' }, selected: 'ORD-1', page: 2 },
      original,
    );
    const parsed = parseGridUrlState(serialized);
    expect(parsed).toEqual({
      sort: [{ id: 'priority', desc: true }],
      filters: { status: 'NEW' },
      selected: 'ORD-1',
      page: 2,
    });
  });

  it('removes a filter key entirely when its value becomes empty', () => {
    const base = new URLSearchParams('f_status=HOLD&f_region=APAC');
    const next = serializeGridUrlState({ filters: { status: '', region: 'APAC' } }, base);
    expect(Array.from(next.keys())).toEqual(['f_region']);
  });

  it('omits the page param entirely when page is 1', () => {
    const next = serializeGridUrlState({ page: 1 }, new URLSearchParams('page=5'));
    expect(next.has('page')).toBe(false);
  });
});
