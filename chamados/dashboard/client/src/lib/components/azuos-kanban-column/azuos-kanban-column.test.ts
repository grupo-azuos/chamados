import { DragDropManager } from '@dnd-kit/dom';
import Hourglass from '@lucide/svelte/icons/hourglass';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import Harness from './azuos-kanban-column-harness.test.svelte';
import KanbanColumn from './azuos-kanban-column.svelte';

describe('AzuosKanbanColumn', () => {
  // feliz
  it('shows the stage with its count and adds a card', async () => {
    const onAdd = vi.fn();
    render(KanbanColumn, {
      props: { data: { title: 'Em andamento', count: 4 }, ui: { tone: 'info' }, actions: { onAdd } },
    });

    expect(screen.getByRole('region', { name: 'Em andamento' })).toBeInTheDocument();
    expect(screen.getByLabelText('4 itens')).toHaveTextContent('4');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(onAdd).toHaveBeenCalledOnce();
  });

  it('shows the stage icon in its tone and edits the stage from the pencil', async () => {
    const onEdit = vi.fn();
    const { container } = render(KanbanColumn, {
      props: { data: { title: 'Aguardando', count: 2 }, ui: { tone: 'warning', icon: Hourglass }, actions: { onEdit } },
    });

    expect(container.querySelector('header svg')).toBeInTheDocument();
    expect(container.querySelector('header')).toHaveClass('bg-hue-yellow');
    await userEvent.click(screen.getByRole('button', { name: 'Editar Aguardando' }));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('becomes a drop area of the board when it gets a drop id', () => {
    const manager = new DragDropManager();
    render(Harness, { props: { manager, dropId: 'column:in_progress' } });

    const droppable = manager.registry.droppables.get('column:in_progress');
    expect(droppable?.element).toBe(screen.getByRole('region', { name: 'Em atendimento' }));
    expect(droppable?.isDropTarget).toBe(false);
  });

  // triste
  it('has no add button, pencil or icon when the screen gives none', () => {
    const { container } = render(KanbanColumn, { props: { data: { title: 'Feito', count: 0 } } });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container.querySelector('header svg')).not.toBeInTheDocument();
  });

  it('is only a drawing without a drop id, even inside a board', () => {
    const manager = new DragDropManager();
    render(Harness, { props: { manager } });

    expect(screen.getByRole('region', { name: 'Em atendimento' })).not.toHaveClass('bg-accent');
    expect([...manager.registry.droppables]).toHaveLength(0);
  });
});
