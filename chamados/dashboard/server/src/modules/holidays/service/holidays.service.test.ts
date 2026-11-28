import { afterEach, describe, expect, it, vi } from 'vitest';

import { type HolidaysClient } from '../repository/holidays.client';
import { HolidaysService } from './holidays.service';

const NEW_YEAR = {
  date: '2026-01-01',
  name: 'Confraternização mundial',
  level: 'national' as const,
};

function serviceWith(fetchYear: HolidaysClient['fetchYear']): HolidaysService {
  return new HolidaysService({ fetchYear } as HolidaysClient);
}

afterEach(() => {
  vi.useRealTimers();
});

describe('HolidaysService.year', () => {
  // feliz
  it('answers the holidays of the state asked, from the API', async () => {
    const fetchYear = vi.fn().mockResolvedValue([NEW_YEAR]);

    await expect(serviceWith(fetchYear).year(2026, 'SP')).resolves.toEqual({
      holidays: [NEW_YEAR],
      state: 'SP',
      source: 'brasilapi',
    });
    expect(fetchYear).toHaveBeenCalledWith(2026, 'SP');
  });

  // feliz
  it('asks the API once a day for the same year and state, and apart for another state', async () => {
    vi.useFakeTimers();
    const fetchYear = vi.fn().mockResolvedValue([NEW_YEAR]);
    const service = serviceWith(fetchYear);

    await service.year(2026, 'GO');
    await service.year(2026, 'GO');
    expect(fetchYear).toHaveBeenCalledTimes(1);

    await service.year(2026, 'SP');
    expect(fetchYear).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(25 * 60 * 60 * 1000);
    await service.year(2026, 'GO');
    expect(fetchYear).toHaveBeenCalledTimes(3);
  });

  // triste
  it('answers an empty list when the API fails, and tries again next time', async () => {
    const fetchYear = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce([NEW_YEAR]);
    const service = serviceWith(fetchYear);

    await expect(service.year(2026, 'GO')).resolves.toMatchObject({
      holidays: [],
      source: 'unavailable',
    });
    await expect(service.year(2026, 'GO')).resolves.toMatchObject({ source: 'brasilapi' });
  });
});
