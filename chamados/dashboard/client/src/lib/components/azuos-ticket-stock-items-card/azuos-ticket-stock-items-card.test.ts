import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { type TicketStockItem } from '@template/shared/schemas/ticket-stock-item.schema';
import { describe, expect, it, vi } from 'vitest';

import TicketStockItemsCard from './azuos-ticket-stock-items-card.svelte';

function item(overrides: Partial<TicketStockItem> = {}): TicketStockItem {
  return {
    id: 10,
    ticketId: 49,
    source: 'parts',
    itemId: 1,
    name: 'Mouse USB',
    direction: 'out',
    quantity: 2,
    settledAt: null,
    createdAt: '2026-11-12T12:00:00.000Z',
    createdByName: 'Ana Lima',
    ...overrides,
  };
}

function actions() {
  return { onOpenLink: vi.fn(), onRemove: vi.fn() };
}

describe('AzuosTicketStockItemsCard', () => {
  // feliz
  it('shows each machine with its items (one machine, many items) and removes one', async () => {
    const handlers = actions();
    render(TicketStockItemsCard, {
      data: {
        items: [
          item({ computerId: 6, computerName: 'Computador 06' }),
          item({
            id: 11,
            name: 'Teclado ABNT2',
            direction: 'in',
            computerId: 6,
            computerName: 'Computador 06',
          }),
          item({ id: 12, name: 'Cabo HDMI' }),
        ],
      },
      actions: handlers,
    });

    const machine = screen.getByRole('list', { name: 'Itens de Computador 06' });
    expect(within(machine).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('list', { name: 'Itens de sem máquina' })).toHaveTextContent(
      'Cabo HDMI',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Tirar Mouse USB do chamado' }));
    expect(handlers.onRemove).toHaveBeenCalledWith(10);
    await userEvent.click(screen.getByRole('button', { name: 'Vincular itens' }));
    expect(handlers.onOpenLink).toHaveBeenCalled();
  });

  // triste
  it('turns read-only on a closed ticket, telling to reopen it', () => {
    render(TicketStockItemsCard, {
      data: { items: [item({ settledAt: '2026-11-12T13:00:00.000Z' })] },
      state: { isClosed: true },
      actions: actions(),
    });

    expect(screen.getByText(/reabra o chamado/)).toBeInTheDocument();
    expect(screen.getByText(/baixado/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vincular itens' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Tirar/ })).toBeNull();
  });

  it('shows the refusal of the server, and says when there is no item yet', () => {
    render(TicketStockItemsCard, {
      data: { items: [] },
      state: { error: 'Só há 1 de Mouse USB disponível no depósito.' },
      actions: actions(),
    });

    expect(screen.getByText('Só há 1 de Mouse USB disponível no depósito.')).toBeInTheDocument();
    expect(screen.getByText('Nenhum item do estoque neste chamado.')).toBeInTheDocument();
  });
});
