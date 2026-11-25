import { describe, expect, it } from 'vitest';

import { load } from './+page';

describe('the old Intelligence address (/infra/insights)', () => {
  // feliz
  it('sends the old link to the inventory filtered by machines that need an upgrade', () => {
    expect(() => load()).toThrow(
      expect.objectContaining({ status: 307, location: '/infra/computers?upgrade=any' }),
    );
  });

  // triste
  it('never renders the removed screen: the load always redirects', () => {
    expect(() => load()).toThrow();
  });
});
