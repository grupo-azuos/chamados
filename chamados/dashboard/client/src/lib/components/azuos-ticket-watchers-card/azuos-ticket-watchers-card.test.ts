import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TicketWatchersCard from './azuos-ticket-watchers-card.svelte';

const options = [
  { id: 'u-bia', name: 'Bia Costa' },
  { id: 'u-caio', name: 'Caio Reis' },
];

describe('AzuosTicketWatchersCard', () => {
  // feliz
  it('lists the linked people and unlinks one in the field', async () => {
    const onChange = vi.fn();
    render(TicketWatchersCard, {
      data: { selectedIds: ['u-bia', 'u-caio'], options },
      actions: { onChange },
    });

    expect(screen.getByRole('list', { name: 'Quem está vinculado' })).toHaveTextContent('Bia Costa');
    await userEvent.click(screen.getByRole('button', { name: /^Pessoas vinculadas/ }));
    await userEvent.click(await screen.findByRole('checkbox', { name: /Bia Costa/ }));

    expect(onChange).toHaveBeenCalledWith(['u-caio']);
  });

  // feliz
  it('says when nobody is linked yet', () => {
    render(TicketWatchersCard, { data: { selectedIds: [], options }, actions: { onChange: vi.fn() } });

    expect(screen.getByText('Ninguém vinculado ainda.')).toBeInTheDocument();
  });

  // triste
  it('shows the refusal of the server under the field', () => {
    render(TicketWatchersCard, {
      data: { selectedIds: [], options },
      state: { error: 'Seu acesso a estas áreas é só de consulta — não atende chamados.' },
      actions: { onChange: vi.fn() },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/só de consulta/);
  });

  // triste
  it('locks the field while saving', () => {
    render(TicketWatchersCard, {
      data: { selectedIds: ['u-bia'], options },
      state: { isSaving: true },
      actions: { onChange: vi.fn() },
    });

    expect(screen.getByRole('button', { name: /^Pessoas vinculadas/ })).toBeDisabled();
  });
});
