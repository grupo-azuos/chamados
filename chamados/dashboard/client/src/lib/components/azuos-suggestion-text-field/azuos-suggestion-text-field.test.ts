import { render, screen } from '@testing-library/svelte';
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
