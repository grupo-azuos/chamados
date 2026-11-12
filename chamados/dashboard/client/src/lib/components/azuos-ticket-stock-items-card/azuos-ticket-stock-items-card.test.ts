import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { type TicketStockItem } from '@template/shared/schemas/ticket-stock-item.schema';
import { describe, expect, it, vi } from 'vitest';

import TicketStockItemsCard, { itemOptionsFor } from './azuos-ticket-stock-items-card.svelte';

const options = [
  { id: 1, name: 'Mouse USB', available: 3 },
  { id: 2, name: 'Teclado ABNT2', available: 0 },
];

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

const values = { itemId: '', direction: 'out' as const, quantity: '1' };

function actions() {
  return { onChange: vi.fn(), onSubmit: vi.fn(), onRemove: vi.fn() };
}

describe('itemOptionsFor', () => {
  // feliz
  it('offers only what is left for a take-out, with how much is left', () => {
    expect(itemOptionsFor(options, 'out')).toEqual([
      { value: '1', label: 'Mouse USB — 3 disponíveis' },
    ]);
  });

  it('offers every item for a return', () => {
    expect(itemOptionsFor(options, 'in')).toHaveLength(2);
  });

  // triste
  it('offers nothing to take out when the shelf is empty', () => {
    expect(itemOptionsFor([{ id: 2, name: 'Teclado', available: 0 }], 'out')).toEqual([]);
  });
});

describe('AzuosTicketStockItemsCard', () => {
  // feliz
  it('lists the items and removes one with its button', async () => {
    const handlers = actions();
    render(TicketStockItemsCard, { data: { items: [item()], options, values }, actions: handlers });

    expect(screen.getByText('Mouse USB')).toBeInTheDocument();
    expect(screen.getByText('Reservado')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tirar Mouse USB do chamado' }));

    expect(handlers.onRemove).toHaveBeenCalledWith(10);
  });

  /* Um card por item, lado a lado: três itens são três cards, cada um com a máquina dele. */
  it('shows each item as its own card, with its machine', () => {
    render(TicketStockItemsCard, {
      data: {
        items: [
          item(),
          item({ id: 11, name: 'Teclado ABNT2', direction: 'in', computerName: 'Computador 06' }),
          item({ id: 12, name: 'Cabo HDMI' }),
        ],
        options,
        values,
      },
      actions: actions(),
    });

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Computador 06')).toBeInTheDocument();
  });

  it('adds the item with its button', async () => {
    const handlers = actions();
    render(TicketStockItemsCard, { data: { items: [], options, values }, actions: handlers });

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));

    expect(handlers.onSubmit).toHaveBeenCalled();
  });

  // triste
  it('turns read-only on a closed ticket, telling to reopen it', () => {
    render(TicketStockItemsCard, {
      data: { items: [item({ settledAt: '2026-11-12T13:00:00.000Z' })], options, values },
      state: { isClosed: true },
      actions: actions(),
    });

    expect(screen.getByText(/reabra o chamado/)).toBeInTheDocument();
    expect(screen.getByText('Baixado no depósito')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar item' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Tirar/ })).toBeNull();
  });

  it('shows the refusal of the server', () => {
    render(TicketStockItemsCard, {
      data: { items: [], options, values, errors: { quantity: 'A quantidade mínima é 1' } },
      state: { error: 'Só há 1 de Mouse USB disponível no depósito.' },
      actions: actions(),
    });

    expect(screen.getByText('Só há 1 de Mouse USB disponível no depósito.')).toBeInTheDocument();
    expect(screen.getByText('A quantidade mínima é 1')).toBeInTheDocument();
  });

  it('says when the ticket has no item yet', () => {
    render(TicketStockItemsCard, { data: { items: [], options, values }, actions: actions() });

    expect(screen.getByText('Nenhum item do estoque neste chamado.')).toBeInTheDocument();
  });
});
