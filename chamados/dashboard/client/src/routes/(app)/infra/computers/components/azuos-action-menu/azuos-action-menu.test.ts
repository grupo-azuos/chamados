import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ActionMenu from './azuos-action-menu.svelte';

const data = {
  label: 'Mais ações',
  items: [
    { id: 'archive', label: 'Arquivar' },
    { id: 'dispose', label: 'Descartar', isDestructive: true, separatorBefore: true },
  ],
};

describe('AzuosActionMenu', () => {
  // feliz
  it('selects an action with the keyboard and closes the menu', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(ActionMenu, { props: { data, actions: { onSelect } } });

    screen.getByRole('button', { name: 'Mais ações' }).focus();
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Arquivar' })).toHaveFocus());
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledWith('archive');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  // triste
  it('does not offer actions while saving', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(ActionMenu, { props: { data, actions: { onSelect }, state: { isDisabled: true } } });

    await user.click(screen.getByRole('button', { name: 'Mais ações' }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
