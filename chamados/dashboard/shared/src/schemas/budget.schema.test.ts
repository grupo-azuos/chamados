import { describe, expect, it } from 'vitest';

import { budgetSchema } from './budget.schema';

describe('budget contract', () => {
  // feliz
  it('accepts the needs with the machines behind each one', () => {
    expect(
      budgetSchema.safeParse({
        needs: [
          {
            key: 'memory',
            needed: 2,
            inStock: 1,
            toBuy: 1,
            machines: [{ computerId: 1, computerName: 'PC-01', computerDisplayName: null, department: null, value: 4 }],
          },
        ],
      }).success,
    ).toBe(true);
  });

  // triste
  it('refuses a need outside the catalog', () => {
    expect(budgetSchema.safeParse({ needs: [{ key: 'cafe', needed: 1, inStock: 0, toBuy: 1, machines: [] }] }).success).toBe(false);
  });
});
