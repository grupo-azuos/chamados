import { describe, expect, it } from 'vitest';

import { holidayListQuerySchema } from './holiday.schema';

describe('holidayListQuerySchema', () => {
  // feliz
  it('reads the year from the address and opens in Goiás without a state', () => {
    expect(holidayListQuerySchema.parse({ year: '2026' })).toEqual({ year: 2026, state: 'GO' });
    expect(holidayListQuerySchema.parse({ year: 2026, state: ' sp ' }).state).toBe('SP');
  });

  // triste
  it('refuses an absurd year and a state that does not exist', () => {
    expect(holidayListQuerySchema.safeParse({ year: 1500 }).success).toBe(false);
    expect(holidayListQuerySchema.safeParse({ year: 2026, state: 'XX' }).success).toBe(false);
  });
});
