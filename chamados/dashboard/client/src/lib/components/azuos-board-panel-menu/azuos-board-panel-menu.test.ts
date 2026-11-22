import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import PanelMenu from './azuos-board-panel-menu.svelte';

function renderMenu(canEdit: boolean) {
  const actions = { onView: vi.fn(), onEdit: vi.fn(), onDuplicate: vi.fn(), onRemove: vi.fn() };
  render(PanelMenu, { props: { data: { title: 'Chamados' }, state: { canEdit }, actions } });

  return actions;
}

async function open() {
  await fireEvent.pointerDown(screen.getByRole('button', { name: 'Menu de Chamados' }), { button: 0, pointerType: 'mouse' });
}

describe('AzuosBoardPanelMenu', () => {
  // feliz
  it('offers view, edit, duplicate and remove to whoever builds the board', async () => {
    const actions = renderMenu(true);
    await open();

    expect(await screen.findByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Remover' })).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicar' }));
    expect(actions.onDuplicate).toHaveBeenCalled();
  });

  // triste
  it('offers only "view" to whoever only sees the board', async () => {
    const actions = renderMenu(false);
    await open();

    await fireEvent.click(await screen.findByRole('menuitem', { name: 'Ver' }));
    expect(actions.onView).toHaveBeenCalled();
    expect(screen.queryByRole('menuitem', { name: 'Editar' })).toBeNull();
  });
});
