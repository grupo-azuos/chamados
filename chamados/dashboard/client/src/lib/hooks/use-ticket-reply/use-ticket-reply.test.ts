import { type PublicTicket } from '@template/shared/schemas/ticket.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-ticket-reply-harness.test.svelte';
import { type TicketReplyModel } from './use-ticket-reply.svelte';

vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: {
    peopleOptions: vi.fn(),
    createRequesterHistory: vi.fn(),
    updateWatchers: vi.fn(),
  },
}));

const { ticketsApi } = await import('$lib/api/tickets.api');

const ticket: PublicTicket = {
  id: 7,
  protocol: 'CH-0007',
  status: 'waiting_requester',
  priority: 'high',
  requesterName: 'Bia Costa',
  area: 'infra',
  department: 'financeiro',
  problemType: 'printer',
  anydeskId: null,
  description: 'A impressora não puxa papel.',
  screenshotUrl: null,
  attachments: [],
  histories: [],
  watchers: [{ id: 'u-caio', name: 'Caio Reis' }],
  notifiable: [{ id: 'u-ana', name: 'Ana Lima' }],
  canReply: true,
  createdAt: '2026-09-15T12:10:00.000Z',
};

function mountModel(input: PublicTicket | null = ticket, onSaved = vi.fn()): TicketReplyModel {
  let model!: TicketReplyModel;
  render(Harness, {
    props: { ticket: input, onSaved, onReady: (ready: TicketReplyModel) => (model = ready) },
  });

  return model;
}

describe('useTicketReplyModel', () => {
  beforeEach(() => {
    vi.mocked(ticketsApi.peopleOptions).mockResolvedValue([{ id: 'u-caio', name: 'Caio Reis' }]);
    vi.mocked(ticketsApi.createRequesterHistory).mockReset().mockResolvedValue({} as never);
    vi.mocked(ticketsApi.updateWatchers).mockReset().mockResolvedValue([]);
  });

  // feliz
  it('sends the reply with the chosen people to notify and reloads the ticket', async () => {
    const onSaved = vi.fn();
    const model = mountModel(ticket, onSaved);

    model.actions.onDescriptionChange('Testei de novo e voltou.');
    model.actions.onNotifyChange(['u-ana']);
    model.actions.onSubmit();

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(ticketsApi.createRequesterHistory).toHaveBeenCalledWith(
      7,
      'requester_reply',
      { description: 'Testei de novo e voltou.', notifyUserIds: ['u-ana'] },
      [],
    );
    expect(model.state.sentMessage).toBe('Retorno enviado ao TI.');
    expect(model.data.description).toBe('');
  });

  // feliz
  it('reopens a closed ticket with the same form', async () => {
    const model = mountModel({ ...ticket, status: 'resolved' });

    model.actions.onDescriptionChange('Voltou a travar.');
    model.actions.onSubmit();

    await waitFor(() => expect(ticketsApi.createRequesterHistory).toHaveBeenCalled());
    expect(vi.mocked(ticketsApi.createRequesterHistory).mock.calls[0]?.[1]).toBe('requester_reopening');
    expect(model.data.type).toBe('requester_reopening');
  });

  // feliz
  it('saves the new list of linked people', async () => {
    const onSaved = vi.fn();
    const model = mountModel(ticket, onSaved);

    model.actions.onWatchersChange(['u-caio', 'u-dani']);

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(ticketsApi.updateWatchers).toHaveBeenCalledWith(7, ['u-caio', 'u-dani']);
  });

  // triste
  it('refuses an empty message without calling the server', () => {
    const model = mountModel();

    model.actions.onSubmit();

    expect(model.state.descriptionError).toBe('Descreva o que aconteceu');
    expect(ticketsApi.createRequesterHistory).not.toHaveBeenCalled();
  });

  // triste
  it('does not write for someone who cannot reply, nor ask for the people list', async () => {
    const model = mountModel({ ...ticket, canReply: false });

    model.actions.onDescriptionChange('Oi');
    model.actions.onSubmit();

    expect(model.state.canReply).toBe(false);
    expect(ticketsApi.createRequesterHistory).not.toHaveBeenCalled();
    expect(ticketsApi.peopleOptions).not.toHaveBeenCalled();
  });

  // triste
  it('shows why the server refused', async () => {
    vi.mocked(ticketsApi.createRequesterHistory).mockRejectedValue(
      new ApiError(422, 'Este chamado está encerrado. Reabra-o para escrever de novo.'),
    );
    const model = mountModel();

    model.actions.onDescriptionChange('Oi');
    model.actions.onSubmit();

    await waitFor(() => expect(model.state.error).toMatch(/encerrado/));
  });
});
