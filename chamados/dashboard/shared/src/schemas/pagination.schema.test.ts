import { describe, expect, it } from 'vitest';

import { paginationQuerySchema, paginationRange } from './pagination.schema';

describe('pagination', () => {
  // feliz
  it('turns page and size into the first and last index', () => {
    expect(paginationRange({ page: 1, pageSize: 25 })).toEqual({ from: 0, to: 24 });
    expect(paginationRange({ page: 3, pageSize: 10 })).toEqual({ from: 20, to: 29 });
  });

  // triste
  it('refuses a page below one', () => {
    expect(paginationQuerySchema.safeParse({ page: 0 }).success).toBe(false);
    expect(paginationQuerySchema.parse({})).toMatchObject({ page: 1 });
  });
});
