import { describe, expect, it } from 'vitest';

import { maintenanceDashboardSchema } from './maintenance-dashboard.schema';

describe('maintenance dashboard contract', () => {
  // feliz
  it('accepts the zeroed panel', () => {
    expect(
      maintenanceDashboardSchema.safeParse({
        inventory: { products: 0, outOfStock: 0 },
        quotes: { pending: 0, pendingAmountCents: 0, approvedAmountCents: 0 },
        disposals: { units: 0 },
        recentMovements: [],
      }).success,
    ).toBe(true);
  });

  // triste
  it('refuses a panel without the shelf', () => {
    expect(maintenanceDashboardSchema.safeParse({ quotes: {} }).success).toBe(false);
  });
});
