import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DateStepper, {
  daysIn,
  isMonthOut,
  partsOf,
  yearsBetween,
} from './azuos-date-stepper.svelte';

describe('AzuosDateStepper', () => {
  // feliz
  it('asks the year, then the month, then the day, and returns ISO', async () => {
    const onChange = vi.fn();
    render(DateStepper, {
      props: { data: { value: null, min: '2020-01-01', max: '2026-12-31' }, actions: { onChange } },
    });

    expect(screen.getByText('Qual é o ano?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '2024' }));
    expect(screen.getByText('Qual é o mês?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fevereiro' }));
    await userEvent.click(screen.getByRole('button', { name: '29' }));

    expect(onChange).toHaveBeenCalledWith('2024-02-29');
  });

  it('opens on the day with a chosen date, and the answers take back to their question', async () => {
    render(DateStepper, {
      props: { data: { value: '2025-03-25' }, actions: { onChange: vi.fn() } },
    });

    expect(screen.getByText('Qual é o dia?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '25' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Ano: 2025. Trocar' }));

    expect(screen.getByText('Qual é o ano?')).toBeInTheDocument();
  });

  // triste
  it('locks months and days outside the limits', async () => {
    render(DateStepper, {
      props: {
        data: { value: null, min: '2026-03-10', max: '2026-12-31' },
        actions: { onChange: vi.fn() },
      },
    });

    await userEvent.click(screen.getByRole('button', { name: '2026' }));
    expect(screen.getByRole('button', { name: 'Fevereiro' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Março' }));

    expect(screen.getByRole('button', { name: '9' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '10' })).toBeEnabled();
  });

  it('reads only ISO dates and counts the days of each month', () => {
    expect(partsOf('25/03/1990')).toBeNull();
    expect(daysIn(2023, 1)).toBe(28);
    expect(isMonthOut(2026, 0, '2026-02-01')).toBe(true);
    expect(yearsBetween('2020-01-01', '2022-01-01', { year: 2026, month: 0, day: 1 })).toEqual([
      2020, 2021, 2022,
    ]);
  });
});
