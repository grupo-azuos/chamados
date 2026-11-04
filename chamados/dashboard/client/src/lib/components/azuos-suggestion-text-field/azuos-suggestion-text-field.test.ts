import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import SuggestionTextField, {
  emptyMessageOf,
  filterOptions,
  nextIndex,
} from './azuos-suggestion-text-field.svelte';

const data = {
  label: 'Fornecedor',
  name: 'supplier',
  value: '',
  options: ['Kalunga', 'Pichau', 'Terabyte'],
};

describe('AzuosSuggestionTextField', () => {
  // feliz
  it('opens the whole list on focus and picks with the arrows and Enter', async () => {
    const onChange = vi.fn();
    render(SuggestionTextField, { props: { data, actions: { onChange } } });

    await userEvent.click(screen.getByRole('combobox', { name: 'Fornecedor' }));
    expect(screen.getAllByRole('option')).toHaveLength(3);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onChange).toHaveBeenLastCalledWith('Pichau');
  });

  it('filters while typing, ignoring case', () => {
    expect(filterOptions(data.options, 'TERA')).toEqual(['Terabyte']);
  });

  // triste
  it('accepts a value that is not on the list, and says so', () => {
    expect(filterOptions(data.options, 'Amazon')).toEqual([]);
    expect(emptyMessageOf(data, undefined)).toMatch(/vale assim mesmo/);
    expect(emptyMessageOf({ ...data, options: [] }, undefined)).toBe('Nada cadastrado ainda.');
  });

  it('wraps the arrows around the list', () => {
    expect(nextIndex(-1, 3, -1)).toBe(2);
    expect(nextIndex(2, 3, 1)).toBe(0);
  });

  it('shows the error under the field', () => {
    render(SuggestionTextField, {
      props: { data, state: { error: 'Informe o fornecedor' }, actions: { onChange: vi.fn() } },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Informe o fornecedor');
  });
});

describe('AzuosSuggestionTextField — the button, the mouse and the keys', () => {
  // feliz
  it('opens and closes the list from the arrow button, keeping the focus on the field', async () => {
    render(SuggestionTextField, { props: { data, actions: { onChange: vi.fn() } } });
    const button = screen.getByRole('button', { name: 'Ver as opções de Fornecedor' });

    await fireEvent.mouseDown(button);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Fornecedor' })).toHaveFocus();

    await fireEvent.mouseDown(button);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // feliz
  it('picks an option with the mouse and closes with Escape', async () => {
    const onChange = vi.fn();
    render(SuggestionTextField, { props: { data, actions: { onChange } } });
    const input = screen.getByRole('combobox', { name: 'Fornecedor' });

    await userEvent.click(input);
    await fireEvent.mouseDown(screen.getByRole('option', { name: 'Terabyte' }));
    expect(onChange).toHaveBeenLastCalledWith('Terabyte');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await userEvent.click(input);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // triste
  it('lets Enter reach the form while nothing is highlighted, and ignores arrows on an empty list', async () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    render(SuggestionTextField, {
      props: { data: { ...data, options: [] }, state: { isRequired: true }, actions: { onChange, onBlur } },
    });
    const input = screen.getByRole('combobox', { name: /Fornecedor/ });

    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Nada cadastrado ainda.')).toBeInTheDocument();
    await userEvent.tab();
    expect(onBlur).toHaveBeenCalledOnce();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // triste
  it('explains a search without matches and keeps what was typed', async () => {
    const onChange = vi.fn();
    render(SuggestionTextField, { props: { data, state: { isLoading: false }, actions: { onChange } } });
    await userEvent.type(screen.getByRole('combobox', { name: 'Fornecedor' }), 'zz');
    expect(onChange).toHaveBeenLastCalledWith('zz');
    expect(screen.getByText(/Nenhuma opção com esse texto/)).toBeInTheDocument();
  });
});

describe('AzuosSuggestionTextField — keyboard edges', () => {
  // feliz
  it('walks the list upwards and closes it with Escape', async () => {
    const onChange = vi.fn();
    render(SuggestionTextField, { props: { data, actions: { onChange } } });
    const input = screen.getByRole('combobox', { name: 'Fornecedor' });

    await userEvent.click(input);
    await userEvent.keyboard('{ArrowUp}');
    expect(input).toHaveAttribute('aria-expanded', 'true');

    await userEvent.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(onChange).not.toHaveBeenCalled();
  });

  // triste
  it('says the options are loading', () => {
    expect(emptyMessageOf({ ...data, options: [] }, { isLoading: true })).toBe('Carregando opções…');
  });
});
