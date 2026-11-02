import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DateRangeField, { orderedRange, rangeLabel } from './azuos-date-range-field.svelte';

const data = { label: 'Período', name: 'period', value: { from: null, to: null } };

describe('AzuosDateRangeField', () => {
  // feliz
  it('applies a period typed in the two edges, in order', async () => {
    const onChange = vi.fn();
    render(DateRangeField, { props: { data, actions: { onChange } } });

    await userEvent.click(screen.getByRole('button', { name: 'Período' }));
    await userEvent.type(await screen.findByLabelText('De'), '31032026');
    await userEvent.type(screen.getByLabelText('Até'), '01032026');
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(onChange).toHaveBeenCalledWith({ from: '2026-03-01', to: '2026-03-31' });
  });

  it('writes the period the way the closed field shows it', () => {
    expect(rangeLabel({ from: '2026-03-01', to: '2026-03-31' })).toBe('01/03/2026 até 31/03/2026');
    expect(rangeLabel({ from: '2026-03-01', to: null })).toBe('A partir de 01/03/2026');
    expect(rangeLabel({ from: null, to: '2026-03-31' })).toBe('Até 31/03/2026');
  });

  // triste
  it('does not apply half a period, and clears at once', async () => {
    const onChange = vi.fn();
    render(DateRangeField, {
      props: {
        data: { ...data, value: { from: '2026-03-01', to: '2026-03-31' } },
        actions: { onChange },
      },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Período' }));
    await userEvent.clear(await screen.findByLabelText('Até'));
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Limpar' }));

    expect(onChange).toHaveBeenCalledWith({ from: null, to: null });
  });

  it('keeps an already ordered period as it is', () => {
    expect(orderedRange({ from: '2026-01-01', to: '2026-02-01' })).toEqual({
      from: '2026-01-01',
      to: '2026-02-01',
    });
  });
});

describe('AzuosDateRangeField — the calendar and the month and year selectors', () => {
  const pick = async (combobox: HTMLElement, option: string) => {
    await fireEvent.pointerDown(combobox);
    await fireEvent.click(combobox);
    await fireEvent.pointerUp(await screen.findByRole('option', { name: option }));
  };

  // feliz
  it('jumps to another month and year, then picks the period by clicking the days', async () => {
    const onChange = vi.fn();
    render(DateRangeField, {
      props: { data: { ...data, value: { from: '2026-03-10', to: '2026-03-12' }, min: '2025-01-01', max: '2027-12-31' }, actions: { onChange } },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Período' }));
    await pick(await screen.findByRole('combobox', { name: 'Mês' }), 'maio');
    await pick(screen.getByRole('combobox', { name: 'Ano' }), '2027');
    expect(screen.getByRole('combobox', { name: 'Ano' })).toHaveTextContent('2027');

    const days = document.querySelectorAll('[data-bits-day]');
    const first = [...days].find((day) => day.textContent?.trim() === '5') as HTMLElement;
    const last = [...days].find((day) => day.textContent?.trim() === '20') as HTMLElement;
    await userEvent.click(first);
    await userEvent.click(last);
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(onChange).toHaveBeenCalledWith({ from: '2027-05-05', to: '2027-05-20' });
  });

  // triste
  it('shows the error under the field and blocks the trigger when disabled', () => {
    render(DateRangeField, {
      props: { data, state: { error: 'Informe o período', isDisabled: true }, actions: { onChange: vi.fn() } },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o período');
    expect(screen.getByRole('button', { name: 'Período' })).toBeDisabled();
  });
});
