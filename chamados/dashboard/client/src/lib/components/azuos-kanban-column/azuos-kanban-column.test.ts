import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import KanbanColumn from './azuos-kanban-column.svelte';

/** O arrasto nativo que o jsdom não monta: só o `getData` que a coluna lê. */
function dropWith(text: string) {
  return { dataTransfer: { getData: () => text, setData: () => {} } };
}

describe('AzuosKanbanColumn', () => {
  // feliz
  it('shows the stage with its count and adds a card', async () => {
    const onAdd = vi.fn();
    render(KanbanColumn, {
      props: {
        data: { title: 'Em andamento', count: 4 },
        ui: { tone: 'info' },
        actions: { onAdd },
      },
    });

    expect(screen.getByRole('region', { name: 'Em andamento' })).toBeInTheDocument();
    expect(screen.getByLabelText('4 itens')).toHaveTextContent('4');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(onAdd).toHaveBeenCalledOnce();
  });

  it('tells the screen which card was dropped on it', async () => {
    const onDropItem = vi.fn();
    render(KanbanColumn, {
      props: { data: { title: 'Feito', count: 0 }, actions: { onDropItem } },
    });

    await fireEvent.drop(screen.getByRole('region', { name: 'Feito' }), dropWith('42'));

    expect(onDropItem).toHaveBeenCalledWith(42);
  });

  // triste
  it('ignores something dropped that is not a card from the screen', async () => {
    const onDropItem = vi.fn();
    render(KanbanColumn, {
      props: { data: { title: 'Feito', count: 0 }, actions: { onDropItem } },
    });

    await fireEvent.drop(screen.getByRole('region', { name: 'Feito' }), dropWith('um texto'));

    expect(onDropItem).not.toHaveBeenCalled();
  });

  it('has no add button when the screen gives no add action', () => {
    render(KanbanColumn, { props: { data: { title: 'Feito', count: 0 } } });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('AzuosKanbanColumn — hovering a card over the column', () => {
  // feliz
  it('lights up while a card hovers over it and dims when the card leaves', async () => {
    render(KanbanColumn, {
      props: { data: { title: 'Em atendimento', count: 1 }, ui: { addLabel: 'Novo' }, actions: { onDropItem: vi.fn(), onAdd: vi.fn() } },
    });
    const column = screen.getByRole('region', { name: 'Em atendimento' });

    await fireEvent.dragOver(column, dropWith('ticket:1'));
    expect(column).toHaveClass('bg-accent');
    await fireEvent.dragLeave(column);
    expect(column).not.toHaveClass('bg-accent');
    expect(screen.getByRole('button', { name: /Novo/ })).toBeInTheDocument();
  });

  // triste
  it('does not react to a card when nothing can be dropped on it', async () => {
    render(KanbanColumn, { props: { data: { title: 'Encerrados', count: 0 } } });
    const column = screen.getByRole('region', { name: 'Encerrados' });

    await fireEvent.dragOver(column, dropWith('ticket:1'));
    expect(column).not.toHaveClass('bg-accent');
  });
});
