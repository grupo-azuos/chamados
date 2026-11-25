import { describe, expect, it } from 'vitest';

import { REFRESH_MS, refreshIntervalOf } from './use-dashboard-board.svelte';

describe('refreshIntervalOf', () => {
  // feliz
  it('turns the chosen option into milliseconds', () => {
    expect(refreshIntervalOf(String(REFRESH_MS))).toBe(REFRESH_MS);
    expect(refreshIntervalOf('60000')).toBe(60_000);
  });

  // triste
  it('turns the automatic refresh off for "off" or anything that is not a number', () => {
    expect(refreshIntervalOf('off')).toBe(false);
    expect(refreshIntervalOf('')).toBe(false);
  });
});
