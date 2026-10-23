import { pageArgs, toPage } from './pagination';

describe('pagination', () => {
  const rows = Array.from({ length: 5 }, (_, i) => ({ id: `id-${i}` }));

  it('requests one extra row to know if there is a next page', () => {
    expect(pageArgs({ limit: 2 })).toEqual({ take: 3 });
    expect(pageArgs({ limit: 2, cursor: 'id-1' })).toEqual({ take: 3, skip: 1, cursor: { id: 'id-1' } });
  });

  it('returns nextCursor when more rows exist', () => {
    expect(toPage(rows.slice(0, 3), { limit: 2 }, (r) => r.id)).toEqual({ items: ['id-0', 'id-1'], nextCursor: 'id-1' });
  });

  it('returns null nextCursor on the last page', () => {
    expect(toPage(rows.slice(0, 2), { limit: 2 }, (r) => r.id)).toEqual({ items: ['id-0', 'id-1'], nextCursor: null });
  });

  it('uses the default limit of 20', () => {
    expect(pageArgs({})).toEqual({ take: 21 });
  });
});
