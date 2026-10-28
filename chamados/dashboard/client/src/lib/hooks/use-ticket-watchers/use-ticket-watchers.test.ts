import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-ticket-watchers-harness.test.svelte';
import { type TicketWatchersModel } from './use-ticket-watchers.svelte';

vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: { people: vi.fn(), peopleOptions: vi.fn(), updateWatchers: vi.fn() },
}));

const { ticketsApi } = await import('$lib/api/tickets.api');

function mountModel(): TicketWatchersModel {
  let model: TicketWatchersModel | undefined;
  render(Harness, { props: { ticketId: 22, onReady: (ready: TicketWatchersModel) => (model = ready) } });
  if (!model) throw new Error('model not ready');

  return model;
}

describe('useTicketWatchersModel', () => {
  beforeEach(() => {
    vi.mocked(ticketsApi.people).mockResolvedValue({
      watchers: [{ id: 'u-caio', name: 'Caio Reis' }],
      notifiable: [],
    });
    vi.mocked(ticketsApi.peopleOptions).mockResolvedValue([
      { id: 'u-bia', name: 'Bia Costa' },
      { id: 'u-caio', name: 'Caio Reis' },
    ]);
    vi.mocked(ticketsApi.updateWatchers).mockReset();
  });

  // feliz
  it('shows who is linked and saves the new list at once', async () => {
    vi.mocked(ticketsApi.updateWatchers).mockResolvedValue([]);
    const model = mountModel();

    await waitFor(() => expect(model.data.selectedIds).toEqual(['u-caio']));
    expect(model.data.options).toHaveLength(2);

    model.actions.onChange(['u-caio', 'u-bia']);

    await waitFor(() => expect(ticketsApi.updateWatchers).toHaveBeenCalledWith(22, ['u-caio', 'u-bia']));
  });

  // triste
  it('shows the refusal of the server to someone who only consults', async () => {
    vi.mocked(ticketsApi.updateWatchers).mockRejectedValue(
      new ApiError(403, 'Seu acesso a estas áreas é só de consulta — não atende chamados.'),
    );
    const model = mountModel();
    await waitFor(() => expect(model.state.isLoading).toBe(false));

    model.actions.onChange([]);

    await waitFor(() => expect(model.state.error).toMatch(/só de consulta/));
  });
});
