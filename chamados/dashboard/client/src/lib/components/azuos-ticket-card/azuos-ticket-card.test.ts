import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TicketCard from './azuos-ticket-card.svelte';

function ticket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 10,
    protocol: 'CH-0010',
    status: 'in_progress',
    priority: 'high',
    requesterName: 'Ana Souza',
    area: 'infra',
    department: 'Comercial',
    problemType: 'printer',
    participantAreas: [],
    anydeskId: null,
    contactPhone: null,
    notifyWhatsapp: false,
    description: 'A impressora do segundo andar não puxa papel',
    screenshotUrl: null,
    computerId: 3,
    computerName: 'COMERCIAL-02',
    assignee: 'Carlos Lima',
    assigneeId: 'u-carlos',
    solution: null,
    createdAt: '2026-10-06T12:00:00.000Z',
    startedAt: null,
    resolvedAt: null,
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

describe('AzuosTicketCard', () => {
  // feliz
  it('shows who opened, the protocol, the situation, the fields and who answers, and opens it', async () => {
    const onOpen = vi.fn();
    render(TicketCard, { props: { data: { ticket: ticket() }, actions: { onOpen } } });

    expect(screen.getByRole('heading', { name: 'Ana Souza' })).toBeInTheDocument();
    expect(screen.getByText('CH-0010')).toBeInTheDocument();
    expect(screen.getByText('Comercial')).toBeInTheDocument();
    expect(screen.getByText('Em atendimento')).toBeInTheDocument();
    expect(screen.getByText('Alta')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Impressora' })).toBeInTheDocument();
    expect(screen.getByText('COMERCIAL-02')).toBeInTheDocument();
    expect(screen.getByText('Carlos Lima')).toBeInTheDocument();
    expect(screen.getByText('Aberto em 06/10/2026')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Abrir o chamado CH-0010 — Ana Souza' }),
    );
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 10 }));
  });

  // triste
  it('says nobody answers yet and draws a dash for a ticket without machine', () => {
    render(TicketCard, {
      props: {
        data: {
          ticket: ticket({
            assignee: null,
            assigneeId: null,
            computerId: null,
            computerName: null,
          }),
        },
        actions: { onOpen: vi.fn() },
      },
    });

    expect(screen.getByText('Sem responsável')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
