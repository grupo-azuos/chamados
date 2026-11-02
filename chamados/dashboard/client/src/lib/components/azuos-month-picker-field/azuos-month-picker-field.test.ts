import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import MonthPickerField, { shortMonth, triggerLabel } from './azuos-month-picker-field.svelte';

describe('AzuosMonthPickerField', () => {
  // feliz
  it('opens on the year of the value and picks a month of another year', async () => {
    const onChange = vi.fn();
    render(MonthPickerField, {
      props: { data: { label: 'Competência', value: '2025-10' }, actions: { onChange } },
    });

    const trigger = screen.getByRole('button', { name: 'Competência' });
    expect(trigger).toHaveTextContent('outubro de 2025');
    await userEvent.click(trigger);
    expect(await screen.findByText('2025')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ano anterior' }));
    await userEvent.click(screen.getByRole('button', { name: 'março de 2024' }));

    expect(onChange).toHaveBeenCalledWith('2024-03');
  });

  it('clears the month from the footer', async () => {
    const onChange = vi.fn();
    render(MonthPickerField, {
      props: { data: { label: 'Competência', value: '2025-10' }, actions: { onChange } },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Competência' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Limpar' }));

    expect(onChange).toHaveBeenCalledWith('');
  });

  // triste
  it('falls back to the invitation for a month that does not exist', () => {
    expect(triggerLabel('2026-13')).toBe('Escolher mês');
    expect(triggerLabel('', 'Todos os meses')).toBe('Todos os meses');
    expect(shortMonth('2026-05')).toBe('mai');
  });

  it('has no clear button with nothing chosen, and shows the error', async () => {
    render(MonthPickerField, {
      props: {
        data: { label: 'Competência', value: '' },
        state: { error: 'Escolha o mês' },
        actions: { onChange: vi.fn() },
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Escolha o mês');
    await userEvent.click(screen.getByRole('button', { name: 'Competência' }));
    await screen.findByRole('button', { name: 'Este mês' });

    expect(screen.queryByRole('button', { name: 'Limpar' })).not.toBeInTheDocument();
  });
});

describe('AzuosMonthPickerField — label and required mark', () => {
  // feliz
  it('marks a required field next to its label', () => {
    render(MonthPickerField, {
      props: { data: { label: 'Competência', value: '2025-10' }, state: { isRequired: true }, actions: { onChange: vi.fn() } },
    });

    expect(screen.getByText('Competência').closest('label')).toHaveTextContent('*');
  });

  // triste
  it('renders no label when the screen gave none', () => {
    render(MonthPickerField, {
      props: { data: { label: '', value: '2025-10' }, actions: { onChange: vi.fn() } },
    });

    expect(document.querySelector('label')).toBeNull();
  });
});
