import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

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
