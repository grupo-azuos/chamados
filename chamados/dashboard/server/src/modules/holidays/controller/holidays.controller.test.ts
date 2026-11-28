import { describe, expect, it, vi } from 'vitest';

import { type HolidaysService } from '../service/holidays.service';
import { HolidaysController } from './holidays.controller';

const NEW_YEAR = {
  date: '2026-01-01',
  name: 'Confraternização mundial',
  level: 'national' as const,
};

function controllerWith(year: HolidaysService['year']): HolidaysController {
  return new HolidaysController({ year } as HolidaysService);
}

describe('HolidaysController.list', () => {
  // feliz
  it('answers the holidays of the year and state asked, saying where they came from', async () => {
    const year = vi
      .fn()
      .mockResolvedValue({ holidays: [NEW_YEAR], state: 'GO', source: 'brasilapi' });

    await expect(controllerWith(year).list({ year: 2026, state: 'GO' })).resolves.toEqual({
      holidays: [NEW_YEAR],
      year: 2026,
      state: 'GO',
      source: 'brasilapi',
    });
    expect(year).toHaveBeenCalledWith(2026, 'GO');
  });

  // triste
  it('answers an empty year, and not an error, when the API is out', async () => {
    const year = vi.fn().mockResolvedValue({ holidays: [], state: 'SP', source: 'unavailable' });

    await expect(controllerWith(year).list({ year: 2026, state: 'SP' })).resolves.toMatchObject({
      holidays: [],
      source: 'unavailable',
    });
  });
});
