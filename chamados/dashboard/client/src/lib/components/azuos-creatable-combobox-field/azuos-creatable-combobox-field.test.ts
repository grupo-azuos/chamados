import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CreatableComboboxField, {
  buildComboboxItems,
  moveHighlight,
} from './azuos-creatable-combobox-field.svelte';

function setup(options = ['Goiânia', 'Anápolis']) {
  const actions = { onChange: vi.fn(), onSearch: vi.fn(), onCreate: vi.fn() };
  render(CreatableComboboxField, {
    props: {
      data: { value: '', options },
      ui: { ariaLabel: 'Cidade', searchPlaceholder: 'Buscar cidade' },
      actions,
    },
  });

  return actions;
}

describe('AzuosCreatableComboboxField', () => {
  // feliz
  it('searches from scratch on opening and picks an existing option', async () => {
    const actions = setup();

    await userEvent.click(screen.getByRole('combobox', { name: 'Cidade' }));
    expect(actions.onSearch).toHaveBeenCalledWith('');
    await userEvent.click(await screen.findByRole('option', { name: 'Anápolis' }));

    expect(actions.onChange).toHaveBeenCalledWith('Anápolis');
  });

  it('registers what was typed with Enter when nothing matches', async () => {
    const actions = setup([]);

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.type(await screen.findByLabelText('Buscar cidade'), 'Trindade{Enter}');

    expect(actions.onCreate).toHaveBeenCalledWith('Trindade');
  });

  // triste
  it('offers the existing option, not a new one, for the same name without accent or case', () => {
    const items = buildComboboxItems({ term: 'goiania', options: ['Goiânia'], hasValue: false });

    expect(items).toEqual([{ kind: 'option', label: 'Goiânia' }]);
  });

  it('does not offer to register while the search has not come back', () => {
    const items = buildComboboxItems({
      term: 'Trindade',
      options: [],
      hasValue: false,
      isLoading: true,
    });

    expect(items).toEqual([]);
  });

  it('keeps the highlight inside the list and ignores other keys', () => {
    expect(moveHighlight('ArrowDown', 2, 3)).toBe(2);
    expect(moveHighlight('ArrowUp', 0, 3)).toBe(0);
    expect(moveHighlight('a', 1, 3)).toBeNull();
  });
});
