import { describe, expect, it } from 'vitest';

import { healthStatusSchema } from './health.schema';

describe('health contract', () => {
  // feliz
  it('accepts the API saying it is up', () => {
    expect(
      healthStatusSchema.parse({ status: 'ok', database: 'up', uptimeSeconds: 10, checkedAt: 'agora' }),
    ).toMatchObject({ status: 'ok' });
  });

  // triste
  it('refuses a negative uptime', () => {
    expect(healthStatusSchema.safeParse({ status: 'ok', database: 'up', uptimeSeconds: -1, checkedAt: 'x' }).success).toBe(false);
  });
});
