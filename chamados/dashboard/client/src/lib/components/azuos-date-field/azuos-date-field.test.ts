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
