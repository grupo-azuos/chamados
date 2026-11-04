import { parseDate } from '@internationalized/date';
import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AzuosDatePicker from './azuos-date-picker.svelte';

describe('AzuosDatePicker', () => {
  // feliz
  it('shows the chosen day in Brazilian format and keeps the ISO value for the form', () => {
    const { container } = render(AzuosDatePicker, {
      props: { value: '2026-09-14', name: 'performedAt', ariaLabel: 'Data da manutenção' },
    });

    expect(screen.getByRole('button')).toHaveTextContent('14 de set. de 2026');
    expect(screen.getByRole('button', { name: 'Data da manutenção' })).toBeInTheDocument();
    expect(container.querySelector('input[name="performedAt"]')).toHaveValue('2026-09-14');
  });

  it('reads only the day when the value comes with time', () => {
    render(AzuosDatePicker, { props: { value: '2026-09-14T10:30:00.000Z' } });

    expect(screen.getByRole('button')).toHaveTextContent('14 de set. de 2026');
  });

  // triste
  it('shows the placeholder while no date was chosen', () => {
    render(AzuosDatePicker, { props: { value: null, placeholder: 'Quando foi feita?' } });

    expect(screen.getByRole('button')).toHaveTextContent('Quando foi feita?');
  });

  it('falls back to the placeholder when the value is not a date', () => {
    render(AzuosDatePicker, { props: { value: 'ontem' } });

    expect(screen.getByRole('button')).toHaveTextContent('Selecione uma data');
  });

  it('locks the button when disabled', () => {
    render(AzuosDatePicker, { props: { value: '2026-09-14', disabled: true } });

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('offers custom month and year selectors when requested', async () => {
    render(AzuosDatePicker, {
      props: { value: '2026-10-19', ariaLabel: 'Data', showMonthYearSelects: true },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Data' }));

    expect(screen.getByRole('combobox', { name: 'Mês' })).toHaveTextContent('outubro');
    expect(screen.getByRole('combobox', { name: 'Ano' })).toHaveTextContent('2026');
    expect(document.querySelector('[data-slot="popover-content"] select')).not.toBeInTheDocument();
  });

  // triste
  it('does not keep showing the previous day after receiving an invalid value', async () => {
    const { rerender } = render(AzuosDatePicker, { props: { value: '2026-10-19' } });

    await rerender({ value: 'invalid' });

    expect(screen.getByRole('button')).toHaveTextContent('Selecione uma data');
  });
});

describe('AzuosDatePicker — jumping between months and odd values', () => {
  const pick = async (combobox: HTMLElement, option: string) => {
    await fireEvent.pointerDown(combobox);
    await fireEvent.click(combobox);
    await fireEvent.pointerUp(await screen.findByRole('option', { name: option }));
  };

  // feliz
  it('moves the calendar with the month and year selectors and picks a day there', async () => {
    const onValueChange = vi.fn();
    const onBlur = vi.fn();
    render(AzuosDatePicker, {
      props: { value: '2026-10-19', ariaLabel: 'Data', showMonthYearSelects: true, onValueChange, onBlur },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Data' }));
    await pick(screen.getByRole('combobox', { name: 'Mês' }), 'março');
    await pick(screen.getByRole('combobox', { name: 'Ano' }), '2025');
    const day = [...document.querySelectorAll('[data-bits-day]')].find((el) => el.textContent?.trim() === '14') as HTMLElement;
    await userEvent.click(day);

    expect(onValueChange).toHaveBeenCalledWith('2025-03-14');
    expect(onBlur).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Data' })).toHaveTextContent('14 de mar. de 2025');
  });

  // feliz
  it('accepts a calendar date object as the value', () => {
    render(AzuosDatePicker, { props: { value: parseDate('2026-01-02'), ariaLabel: 'Data' } });
    expect(screen.getByRole('button', { name: 'Data' })).toHaveTextContent('2 de jan. de 2026');
  });

  // triste
  it('falls back to the placeholder for an impossible date', () => {
    render(AzuosDatePicker, { props: { value: '2026-13-45', placeholder: 'Quando?' } });
    expect(screen.getByRole('button')).toHaveTextContent('Quando?');
  });
});
