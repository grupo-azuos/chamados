import { DragDropManager } from '@dnd-kit/dom';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';

import Harness from './azuos-kanban-draggable-card-harness.test.svelte';

/* O jsdom não tem as animações nem a camada de cima (popover) do navegador, que o arrasto usa
   para levantar a cópia do cartão: aqui elas não fazem nada. */
beforeAll(() => {
  const noAnimations = () => [];
  Object.assign(document, { getAnimations: noAnimations, elementFromPoint: () => null });
  Object.assign(Element.prototype, { getAnimations: noAnimations });
  Object.assign(HTMLElement.prototype, { showPopover() {}, hidePopover() {} });
});

describe('AzuosKanbanDraggableCard', () => {
  // feliz
  it('registers the card in the board and lets the keyboard pick it up and give it back', async () => {
    const manager = new DragDropManager();
    render(Harness, { props: { manager } });
    const card = screen.getByRole('button', { name: 'Mover o chamado CH-0010' });

    expect(card).toHaveAttribute('tabindex', '0');
    expect(card).toHaveAttribute('aria-roledescription', 'cartão arrastável');
    expect(manager.registry.draggables.get(10)?.element).toBe(card);
    expect(screen.getByText('Bug no login')).toBeInTheDocument();

    card.focus();
    await userEvent.keyboard(' ');
    await waitFor(() => expect(manager.dragOperation.source?.id).toBe(10));
    /* O lugar do cartão vira o tracejado de "solte aqui" enquanto a cópia anda. */
    await waitFor(() => expect(card).toHaveClass('border-dashed'));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(manager.dragOperation.status.idle).toBe(true));
    await waitFor(() => expect(card).not.toHaveClass('border-dashed'));
  });

  // triste
  it('stays put while it cannot be dragged', () => {
    const manager = new DragDropManager();
    render(Harness, { props: { manager, isDisabled: true } });
    const card = screen.getByRole('button', { name: 'Mover o chamado CH-0010' });

    expect(card).toHaveAttribute('tabindex', '-1');
    expect(card).toHaveAttribute('aria-disabled', 'true');
    expect(card).not.toHaveClass('cursor-grab');
    expect(manager.registry.draggables.get(10)?.disabled).toBe(true);
  });
});
