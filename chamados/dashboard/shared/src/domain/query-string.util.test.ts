import { describe, expect, it } from 'vitest';

import { buildQueryString } from './query-string.util';

describe('buildQueryString', () => {
  it('serializes the given values in order', () => {
    expect(buildQueryString({ page: 2, search: 'master fort', onlyPending: true })).toBe(
      '?page=2&search=master+fort&onlyPending=true',
    );
  });

  it('joins a list with commas', () => {
    expect(buildQueryString({ ids: ['a', 'b'] })).toBe('?ids=a%2Cb');
  });

  // triste
  it('leaves out missing, null, blank and empty list values', () => {
    expect(buildQueryString({ a: undefined, b: null, c: '  ', d: [] })).toBe('');
  });

  it('keeps zero and false, which are values and not absence', () => {
    expect(buildQueryString({ page: 0, hasNoOwner: false })).toBe('?page=0&hasNoOwner=false');
  });
});
