import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import PeoplePicker, { summaryOf } from './azuos-people-picker.svelte';

const options = [
  { id: 'u-1', name: 'Ana Lima' },
  { id: 'u-2', name: 'Bia Costa' },
  { id: 'u-3', name: 'Caio Reis' },
];

describe('AzuosPeoplePicker', () => {
  // feliz
  it('shows the chosen people as chips and removes one with its button', async () => {
    const onChange = vi.fn();
    render(PeoplePicker, { data: { selectedIds: ['u-1', 'u-2'], options }, actions: { onChange } });

    expect(screen.getByRole('button', { name: /ana lima e bia costa/i })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Tirar Ana Lima' }));

    expect(onChange).toHaveBeenCalledWith(['u-2']);
  });

  // feliz
  it('summarises long selections without growing the trigger', () => {
    expect(summaryOf([], 'Escolha')).toBe('Escolha');
    expect(summaryOf([options[0]!], 'Escolha')).toBe('Ana Lima');
    expect(summaryOf(options, 'Escolha')).toBe('Ana Lima e mais 2');
  });

  // triste
  it('keeps a chosen person that left the directory, so nobody vanishes silently', () => {
    render(PeoplePicker, {
      data: { selectedIds: ['gone'], options },
      actions: { onChange: vi.fn() },
    });

    expect(screen.getByRole('button', { name: 'Tirar Pessoa removida' })).toBeTruthy();
  });

  // triste
  it('shows the error under the field', () => {
    render(PeoplePicker, {
      data: { selectedIds: [], options },
      state: { error: 'Vincule até 20 pessoas' },
      actions: { onChange: vi.fn() },
    });

    expect(screen.getByRole('alert').textContent).toContain('Vincule até 20 pessoas');
  });
});
