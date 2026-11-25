import { parseDate } from '@internationalized/date';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AzuosCalendar, {
  calendarMonths,
  calendarYears,
  weekdayLabel,
} from './azuos-calendar.svelte';

function dayOf(text: string): HTMLElement {
  return [...document.querySelectorAll<HTMLElement>('[data-bits-day]')].find(
    (day) => day.textContent?.trim() === text,
  )!;
}

describe('AzuosCalendar — helpers', () => {
  // feliz
  it('lists a hundred years back and ten ahead without limits', () => {
    const years = calendarYears(undefined, undefined, parseDate('2026-05-01'));

    expect(years[0]).toEqual({ value: 1926, label: '1926' });
    expect(years.at(-1)).toEqual({ value: 2036, label: '2036' });
  });

  // feliz
  it('writes the weekday without the dot', () => {
    expect(weekdayLabel('dom.')).toBe('dom');
    expect(weekdayLabel('Sáb.')).toBe('sáb');
  });

  // triste
  it('turns off the months outside the limits', () => {
    const months = calendarMonths(2026, parseDate('2026-03-10'), parseDate('2026-09-01'));

    expect(months[0]).toMatchObject({ value: 1, label: 'Janeiro', disabled: true });
    expect(months[2]).toMatchObject({ value: 3, disabled: false });
    expect(months[8]).toMatchObject({ value: 9, disabled: false });
    expect(months[9]).toMatchObject({ value: 10, disabled: true });
  });

  // triste
  it('keeps at least one year when the limits fall in the same year', () => {
    expect(calendarYears(parseDate('2026-01-01'), parseDate('2026-12-31'))).toEqual([
      { value: 2026, label: '2026' },
    ]);
  });
});

describe('AzuosCalendar', () => {
  // feliz
  it('opens on the value with the month and year dropdowns between the arrows', () => {
    render(AzuosCalendar, { props: { data: { value: parseDate('2026-09-14') } } });

    expect(screen.getByRole('button', { name: 'Mês: Setembro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ano: 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir para o mês anterior' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir para o mês seguinte' })).toBeInTheDocument();
    expect(dayOf('14')).toHaveAttribute('data-selected');
    expect(document.querySelector('select')).toBeNull();
  });

  // feliz
  it('jumps with the dropdowns and delivers the clicked day', async () => {
    const onValueChange = vi.fn();
    const onMonthChange = vi.fn();
    render(AzuosCalendar, {
      props: { data: { value: parseDate('2026-09-14') }, actions: { onValueChange, onMonthChange } },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Mês: Setembro' }));
    await userEvent.click(screen.getByRole('option', { name: 'Março' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ano: 2026' }));
    await userEvent.click(screen.getByRole('option', { name: '2025' }));
    await userEvent.click(dayOf('20'));

    expect(onMonthChange).toHaveBeenLastCalledWith(expect.objectContaining({ year: 2025, month: 3 }));
    expect(onValueChange).toHaveBeenCalledWith(parseDate('2025-03-20'));
  });

  // feliz
  it('selects a period in two months side by side, hiding the neighbour days', async () => {
    const onRangeChange = vi.fn();
    render(AzuosCalendar, {
      props: {
        data: { month: parseDate('2026-03-01') },
        ui: { mode: 'range', numberOfMonths: 2, showOutsideDays: false },
        actions: { onRangeChange },
      },
    });

    expect(screen.getByRole('button', { name: 'Mês: Março' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mês: Abril' })).toBeInTheDocument();
    /* 31 de março + 30 de abril, sem repetir o fim de março no quadro de abril. */
    expect(document.querySelectorAll('[data-bits-day]')).toHaveLength(61);

    await userEvent.click(dayOf('10'));
    await userEvent.click(dayOf('12'));

    expect(onRangeChange).toHaveBeenLastCalledWith({
      start: parseDate('2026-03-10'),
      end: parseDate('2026-03-12'),
    });
  });

  // triste
  it('does not deliver a day outside the limits', async () => {
    const onValueChange = vi.fn();
    render(AzuosCalendar, {
      props: {
        data: { month: parseDate('2026-09-01'), min: parseDate('2026-09-10') },
        actions: { onValueChange },
      },
    });

    expect(dayOf('5')).toHaveAttribute('data-disabled');
    await userEvent.click(dayOf('5'));

    expect(onValueChange).not.toHaveBeenCalled();
  });

  // triste
  it('locks the dropdowns when disabled', () => {
    render(AzuosCalendar, {
      props: { data: { value: parseDate('2026-09-14') }, state: { isDisabled: true } },
    });

    expect(screen.getByRole('button', { name: 'Mês: Setembro' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ano: 2026' })).toBeDisabled();
  });
});
