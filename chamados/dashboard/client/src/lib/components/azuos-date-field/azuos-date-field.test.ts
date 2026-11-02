import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DateField, { INVALID_DATE, typedProblem } from './azuos-date-field.svelte';

const data = { label: 'Data da compra', name: 'boughtAt', value: null };

describe('AzuosDateField', () => {
  // feliz
  it('puts the slashes in and hands over ISO once the date is complete', async () => {
    const onChange = vi.fn();
    render(DateField, { props: { data, actions: { onChange } } });

    await userEvent.type(screen.getByLabelText('Data da compra'), '25032024');

    expect(screen.getByLabelText('Data da compra')).toHaveValue('25/03/2024');
    expect(onChange).toHaveBeenLastCalledWith('2024-03-25');
  });

  it('shows the date that came from outside, in Brazilian format', () => {
    render(DateField, {
      props: { data: { ...data, value: '2024-03-25' }, actions: { onChange: vi.fn() } },
    });

    expect(screen.getByLabelText('Data da compra')).toHaveValue('25/03/2024');
  });

  // triste
  it('warns about an invalid date only on leaving the field, and keeps the text', async () => {
    render(DateField, { props: { data, actions: { onChange: vi.fn() } } });
    const field = screen.getByLabelText('Data da compra');

    await userEvent.type(field, '3102');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await userEvent.tab();

    expect(screen.getByRole('alert')).toHaveTextContent(INVALID_DATE);
    expect(field).toHaveValue('31/02');
  });

  it('refuses a date outside the limits with the range hint', () => {
    expect(typedProblem('01/01/2020', '2024-01-01')).not.toBeNull();
    expect(typedProblem('', '2024-01-01')).toBeNull();
  });
});

describe('AzuosDateField — clearing, the calendar and the label', () => {
  // feliz
  it('clears the date when the text is erased and picks a day from the calendar', async () => {
    const onChange = vi.fn();
    render(DateField, {
      props: { data: { ...data, value: '2026-03-10', isRequired: true }, ui: { startYear: 2026 }, actions: { onChange } },
    });

    await userEvent.clear(screen.getByRole('textbox', { name: /Data da compra/ }));
    await userEvent.tab();
    expect(onChange).toHaveBeenLastCalledWith(null);

    /* Com uma data escolhida, o calendário abre direto no dia. */
    await userEvent.click(screen.getByRole('button', { name: /Escolher Data da compra no calendário/ }));
    await userEvent.click(await screen.findByRole('button', { name: '15' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-03-15');
  });

  // feliz
  it('can hide its label for the screen while keeping it for readers', () => {
    render(DateField, { props: { data, ui: { isLabelHidden: true }, actions: { onChange: vi.fn() } } });
    expect(screen.getByText('Data da compra')).toHaveClass('sr-only');
  });
});
