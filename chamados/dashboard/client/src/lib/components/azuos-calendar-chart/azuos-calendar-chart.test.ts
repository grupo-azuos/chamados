import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import CalendarChart, { calendarOption, calendarRange, firstDayOfMonth } from './azuos-calendar-chart.svelte';

describe('calendarRange', () => {
  // feliz
  it('covers whole months, to the last day of the last one', () => {
    expect(calendarRange('2026-10-01', 12)).toEqual(['2026-10-01', '2027-09-30']);
    expect(calendarRange('2026-11-01', 4)).toEqual(['2026-11-01', '2027-02-28']);
  });

  it('starts on the first day of the current month', () => {
    expect(firstDayOfMonth(new Date(2026, 9, 24))).toBe('2026-10-01');
  });
});

describe('AzuosCalendarChart', () => {
  // feliz
  /* A escala vem ESCRITA ("Menos … Mais"): a cor não pode ser o único jeito de ler o quadro. */
  it('writes the scale next to the colours', () => {
    render(CalendarChart, {
      props: { data: { days: [{ date: '2026-11-10', count: 3 }], seriesLabel: 'chamados' } },
    });

    expect(screen.getByText('Menos')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /3 chamados/ })).toBeInTheDocument();
  });

  // triste
  it('says there is nothing instead of drawing an empty calendar', () => {
    render(CalendarChart, {
      props: { data: { days: [], seriesLabel: 'chamados' }, ui: { emptyLabel: 'Nada no período' } },
    });

    expect(screen.getByText('Nada no período')).toBeInTheDocument();
    expect(screen.queryByText('Menos')).not.toBeInTheDocument();
  });
});

describe('calendarOption', () => {
  // feliz
  it('writes the day the Brazilian way with the count, and lays every day on the calendar', () => {
    const option = calendarOption(
      [{ date: '2026-11-10', count: 3 }],
      ['2026-11-01', '2026-11-30'],
      'chamados',
      { track: '#eee', surface: '#fff', muted: '#888' },
    ) as { tooltip: { formatter: (params: unknown) => string }; visualMap: { max: number }; series: { data: unknown[] }[] };

    expect(option.tooltip.formatter({ value: ['2026-11-10', 1234] })).toBe('<b>10/11/2026</b><br/>1.234 chamados');
    expect(option.tooltip.formatter({ value: [] })).toContain('0 chamados');
    expect(option.visualMap.max).toBe(3);
    expect(option.series[0]!.data).toEqual([['2026-11-10', 3]]);
  });

  // triste
  it('does not divide by zero on an empty period', () => {
    const option = calendarOption([], ['2026-11-01', '2026-11-30'], 'chamados', { track: '#eee', surface: '#fff', muted: '#888' }) as { visualMap: { max: number } };
    expect(option.visualMap.max).toBe(1);
  });
});
