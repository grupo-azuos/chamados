import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
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

describe('AzuosPeoplePicker — the list behind the trigger', () => {
  // feliz
  it('opens the list, searches by name and toggles a person in and out', async () => {
    const onChange = vi.fn();
    render(PeoplePicker, {
      data: { selectedIds: ['u-1'], options },
      ui: { ariaLabel: 'Pessoas vinculadas', placeholder: 'Escolha' },
      actions: { onChange },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Pessoas vinculadas' }));
    const list = await screen.findByRole('listbox', { hidden: true });
    expect(within(list).getAllByRole('option', { hidden: true })).toHaveLength(3);
    expect(within(list).getByRole('option', { name: /Ana Lima/, hidden: true })).toHaveAttribute('aria-selected', 'true');

    await fireEvent.input(screen.getByRole('textbox', { name: 'Buscar pessoas', hidden: true }), { target: { value: 'bia' } });
    expect(within(list).getAllByRole('option', { hidden: true })).toHaveLength(1);
    await fireEvent.click(within(list).getByRole('option', { name: /Bia Costa/, hidden: true }));
    expect(onChange).toHaveBeenLastCalledWith(['u-1', 'u-2']);

    await fireEvent.input(screen.getByRole('textbox', { name: 'Buscar pessoas', hidden: true }), { target: { value: 'ana' } });
    await fireEvent.click(within(list).getByRole('option', { name: /Ana Lima/, hidden: true }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  // triste
  it('says when nobody matches and when the list is still loading', async () => {
    render(PeoplePicker, { data: { selectedIds: [], options }, ui: { ariaLabel: 'Pessoas' }, actions: { onChange: vi.fn() } });
    await fireEvent.click(screen.getByRole('button', { name: 'Pessoas' }));
    await fireEvent.input(await screen.findByRole('textbox', { name: 'Buscar pessoas', hidden: true }), { target: { value: 'zzz' } });
    expect(screen.getByText('Ninguém encontrado.')).toBeInTheDocument();

    cleanup();
    render(PeoplePicker, { data: { selectedIds: [], options }, ui: { ariaLabel: 'Pessoas' }, state: { isLoading: true }, actions: { onChange: vi.fn() } });
    await fireEvent.click(screen.getByRole('button', { name: 'Pessoas' }));
    expect(await screen.findByText('Carregando pessoas…')).toBeInTheDocument();
  });

  // triste
  it('cannot be opened while disabled', () => {
    render(PeoplePicker, { data: { selectedIds: [], options }, ui: { ariaLabel: 'Pessoas' }, state: { isDisabled: true }, actions: { onChange: vi.fn() } });
    expect(screen.getByRole('button', { name: 'Pessoas' })).toBeDisabled();
  });
});
