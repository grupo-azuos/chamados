import { afterEach, describe, expect, it, vi } from 'vitest';

import { HolidaysClient, toHolidays } from './holidays.client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('toHolidays', () => {
  // feliz
  it('reads national and state holidays, in date order, as the BrasilAPI writes them', () => {
    expect(
      toHolidays([
        { date: '2026-07-26', name: 'Fundação da Cidade de Goiás', type: 'state', state: 'GO' },
        {
          date: '2026-01-01',
          name: 'Confraternização mundial',
          type: 'national',
          weekday: 'quinta-feira',
        },
      ]),
    ).toEqual([
      { date: '2026-01-01', name: 'Confraternização mundial', level: 'national' },
      { date: '2026-07-26', name: 'Fundação da Cidade de Goiás', level: 'state' },
    ]);
  });

  // triste
  it('drops what has no valid date or name, and repeated days, never guessing', () => {
    expect(
      toHolidays([
        { date: '2026-02-31', name: 'Dia que não existe' },
        { name: 'Sem data' },
        { date: '2026-04-21', name: 'Tiradentes', type: 'outro' },
        { date: '2026-04-21', name: 'Tiradentes', type: 'outro' },
      ]),
    ).toEqual([{ date: '2026-04-21', name: 'Tiradentes', level: 'other' }]);
  });

  // triste
  it('answers nothing usable for a body that is not a list', () => {
    expect(toHolidays({ message: 'UF inválida' })).toBeUndefined();
  });
});

describe('HolidaysClient.fetchYear', () => {
  // feliz
  it('asks the year and the state, with no key', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify([{ date: '2026-01-01', name: 'Ano novo', type: 'national' }])),
      );
    vi.stubGlobal('fetch', fetchMock);

    const holidays = await new HolidaysClient().fetchYear(2026, 'GO');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://brasilapi.com.br/api/feriados/v1/2026?uf=GO');
    expect(init.headers).not.toHaveProperty('authorization');
    expect(holidays).toHaveLength(1);
  });

  // triste
  it('answers nothing when the API refuses the state or is out', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 400 })));
    await expect(new HolidaysClient().fetchYear(2026, 'XX')).resolves.toBeUndefined();

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    await expect(new HolidaysClient().fetchYear(2026, 'GO')).resolves.toBeUndefined();
  });
});
