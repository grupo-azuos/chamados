import { type FilterGroup } from '@template/shared/schemas/dashboard-board.schema';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import FilterGroupEditor from './azuos-filter-group-editor.svelte';

const GROUP: FilterGroup = {
  id: 'g',
  combinator: 'and',
  rules: [{ id: 'r1', field: 'status', operator: '=', value: 'open' }],
};

function renderEditor(group: FilterGroup = GROUP, depth = 1) {
  const onChange = vi.fn();
  render(FilterGroupEditor, { props: { data: { source: 'infraTickets', group, depth }, actions: { onChange } } });

  return onChange;
}

describe('AzuosFilterGroupEditor', () => {
  // feliz
  it('adds a condition and a group inside', async () => {
    const onChange = renderEditor();

    await fireEvent.click(screen.getByRole('button', { name: 'Condição' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Grupo' }));

    expect(onChange.mock.calls[0]![0].rules).toHaveLength(2);
    expect(onChange.mock.calls[1]![0].rules[1]).toMatchObject({ combinator: 'and', rules: [] });
  });

  // feliz
  it('takes a condition off', async () => {
    const onChange = renderEditor();

    await fireEvent.click(screen.getByRole('button', { name: 'Tirar a condição' }));

    expect(onChange).toHaveBeenCalledWith({ ...GROUP, rules: [] });
  });

  // triste
  it('stops offering a group inside at the depth limit', () => {
    renderEditor(GROUP, 4);

    expect(screen.queryByRole('button', { name: 'Grupo' })).not.toBeInTheDocument();
  });
});
