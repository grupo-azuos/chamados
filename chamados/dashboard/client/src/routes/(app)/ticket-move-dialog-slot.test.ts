import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { fireEvent, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import { type TicketKanbanPendingMove } from '$lib/hooks/use-ticket-kanban/use-ticket-kanban.svelte';

import { renderPage, visiting } from '../route-page.test-support';
import Slot from './ticket-move-dialog-slot.svelte';

vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: {
    createHistory: vi.fn(),
    people: vi.fn(() => Promise.resolve({ watchers: [], notifiable: [] })),
  },
}));

const { ticketsApi } = await import('$lib/api/tickets.api');

const TICKET = {
  id: 44,
  protocol: 'CH-0044',
  status: 'in_progress',
  area: 'manutencao',
  participantAreas: [],
} as unknown as Ticket;

function closing(): TicketKanbanPendingMove {
  return {
    ticket: TICKET,
    target: 'closed',
    targetTitle: 'Concluído',
    types: ['resolution', 'closure_with_caveats', 'cancellation'],
    initialType: 'resolution',
  };
}

function renderSlot(move: TicketKanbanPendingMove = closing()) {
  const onRecorded = vi.fn();
  const onCancel = vi.fn();
  renderPage(Slot as never, { move, onRecorded, onCancel });

  return { onRecorded, onCancel };
}

async function describeSolution(text: string) {
  const field = await screen.findByRole('textbox', { name: /O que foi feito/ });
  await fireEvent.input(field, { target: { value: text } });
}

describe('the dialog of a move on the board', () => {
  beforeEach(() => {
    visiting({});
    vi.mocked(ticketsApi.createHistory).mockReset().mockResolvedValue({} as never);
  });

  // feliz
  it('records the solution and only then lets the card go to "done"', async () => {
    const { onRecorded } = renderSlot();

    expect(await screen.findByRole('heading', { name: 'Mover CH-0044 para "Concluído"' })).toBeInTheDocument();
    await describeSolution('Troquei a dobradiça da porta.');
    await userEvent.click(screen.getByRole('button', { name: 'Encerrar chamado' }));

    await waitFor(() => expect(onRecorded).toHaveBeenCalledOnce());
    expect(ticketsApi.createHistory).toHaveBeenCalledWith(
      44,
      expect.objectContaining({ type: 'resolution', description: 'Troquei a dobradiça da porta.' }),
      [],
    );
  });

  it('lets the person pick another way to close among the ones that lead there', async () => {
    const { onRecorded } = renderSlot();

    await userEvent.click(await screen.findByRole('radio', { name: /Cancelamento/ }));
    await describeSolution('Aberto em duplicidade.');
    await userEvent.click(screen.getByRole('button', { name: 'Encerrar chamado' }));

    await waitFor(() => expect(onRecorded).toHaveBeenCalledOnce());
    expect(vi.mocked(ticketsApi.createHistory).mock.calls[0]?.[1]).toMatchObject({ type: 'cancellation' });
  });

  // triste
  it('gives the card back without recording anything when the person cancels', async () => {
    const { onCancel, onRecorded } = renderSlot();

    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalled();
    expect(onRecorded).not.toHaveBeenCalled();
    expect(ticketsApi.createHistory).not.toHaveBeenCalled();
  });

  it('does not record a move without the text the history asks for', async () => {
    renderSlot();

    await userEvent.click(await screen.findByRole('button', { name: 'Encerrar chamado' }));

    expect(await screen.findByText('Descreva o que aconteceu')).toBeInTheDocument();
    expect(ticketsApi.createHistory).not.toHaveBeenCalled();
  });

  it('keeps the dialog open with the refusal of the server', async () => {
    vi.mocked(ticketsApi.createHistory).mockRejectedValue(
      new ApiError(403, 'Só quem administra alguma área deste chamado pode encerrá-lo ou reabri-lo.'),
    );
    const { onRecorded } = renderSlot();

    await describeSolution('Feito.');
    await userEvent.click(screen.getByRole('button', { name: 'Encerrar chamado' }));

    expect(await screen.findByText(/pode encerrá-lo ou reabri-lo/)).toBeInTheDocument();
    expect(onRecorded).not.toHaveBeenCalled();
  });
});
