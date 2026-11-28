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

  // feliz
  it('opens from the three dots alone, named for the screen reader', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(ActionMenu, { props: { data, ui: { isIconOnly: true }, actions: { onSelect } } });

    const trigger = screen.getByRole('button', { name: 'Mais ações' });
    expect(trigger).not.toHaveTextContent('Mais ações');
    await user.click(trigger);
    await user.click(await screen.findByRole('menuitem', { name: 'Arquivar' }));

    expect(onSelect).toHaveBeenCalledWith('archive');
  });

  // feliz
  /* A linha clicável da tabela não abre junto com o menu. */
  it('keeps the click of the three dots away from the clickable row', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(ActionMenu, { props: { data, ui: { isIconOnly: true }, actions: { onSelect: vi.fn() } } });
    /* A linha mora acima do menu: o clique que sobe até ela é o que abriria o registro junto. */
    document.body.addEventListener('click', onRowClick);

    await user.click(screen.getByRole('button', { name: 'Mais ações' }));

    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(onRowClick).not.toHaveBeenCalled();
    document.body.removeEventListener('click', onRowClick);
  });

  // feliz
  it('renders a link item that navigates instead of selecting', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(ActionMenu, {
      props: {
        data: { label: 'Mais ações', items: [{ id: 'open', label: 'Ver chamado', href: '/infra/tickets/7' }] },
        actions: { onSelect },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Mais ações' }));

    const link = await screen.findByRole('menuitem', { name: 'Ver chamado' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/infra/tickets/7');
  });

  // triste
  it('does not select a locked item', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onSelect = vi.fn();
    render(ActionMenu, {
      props: {
        data: { label: 'Mais ações', items: [{ id: 'archive', label: 'Arquivar', isDisabled: true }] },
        actions: { onSelect },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Mais ações' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Arquivar' }));

    expect(onSelect).not.toHaveBeenCalled();
  });
});
