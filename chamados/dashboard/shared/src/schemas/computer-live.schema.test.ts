import { describe, expect, it } from 'vitest';

import { computerLiveResponseSchema } from './computer-live.schema';

describe('computer live contract', () => {
  // feliz
  it('accepts a machine without a live reading', () => {
    expect(computerLiveResponseSchema.parse({ live: null })).toEqual({ live: null });
  });

  // triste
  it('refuses a reading without the moment it was measured', () => {
    expect(computerLiveResponseSchema.safeParse({ live: { computerId: 1 } }).success).toBe(false);
  });
});
