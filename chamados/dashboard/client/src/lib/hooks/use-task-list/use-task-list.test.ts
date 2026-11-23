import { describe, expect, it } from 'vitest';

import { monthRange, shiftMonth } from './use-task-list.svelte';

describe('task month helpers', () => {
  // feliz
  it('gives the first and last day of a month, February included', () => {
    expect(monthRange('2026-11')).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  // triste
  it('crosses the turn of the year both ways', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2027-01', -1)).toBe('2026-12');
  });
});
