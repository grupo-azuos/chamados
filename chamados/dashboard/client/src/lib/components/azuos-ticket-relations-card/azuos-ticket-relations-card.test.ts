import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TicketRelationsCard from './azuos-ticket-relations-card.svelte';

const sampleRelations = [
  {
    id: 1,
    ticketId: 10,
    relatedTicketId: 15,
    relatedTicket: {
      id: 15,
      protocol: 'CH-0015',
      description: 'Problema no roteador da recepção',
      status: 'open' as const,
      priority: 'high' as const,
      area: 'infra' as const,
      requesterName: 'Lucas Lima',
      createdAt: '2026-11-05T10:00:00.000Z',
    },
    createdAt: '2026-11-05T12:00:00.000Z',
    createdBy: 'admin@azuos.local',
  },
];

const sampleSearchResults = [
  {
    id: 25,
    protocol: 'CH-0025',
    description: 'Cadeira com defeito no pistão',
    status: 'in_progress' as const,
    priority: 'low' as const,
    area: 'manutencao' as const,
    requesterName: 'Gisele',
    createdAt: '2026-11-05T11:00:00.000Z',
  },
];

describe('AzuosTicketRelationsCard', () => {
  it('says when no tickets are linked yet', () => {
    render(TicketRelationsCard, {
      data: { relations: [] },
      actions: {
        onSearchChange: vi.fn(),
        onAddRelation: vi.fn(),
        onRemoveRelation: vi.fn(),
      },
    });

    expect(screen.getByText('Nenhum chamado vinculado a este ainda.')).toBeInTheDocument();
  });

  it('renders linked tickets and allows unlinking', async () => {
    const onRemoveRelation = vi.fn();
    render(TicketRelationsCard, {
      data: { relations: sampleRelations },
      actions: {
        onSearchChange: vi.fn(),
        onAddRelation: vi.fn(),
        onRemoveRelation,
      },
    });

    expect(screen.getByText('CH-0015')).toBeInTheDocument();
    expect(screen.getByText('Problema no roteador da recepção')).toBeInTheDocument();

    const unlinkBtn = screen.getByRole('button', { name: 'Desvincular chamado CH-0015' });
    await userEvent.click(unlinkBtn);

    expect(onRemoveRelation).toHaveBeenCalledWith(15);
  });

  it('searches tickets and triggers link action', async () => {
    const onSearchChange = vi.fn();
    const onAddRelation = vi.fn();

    render(TicketRelationsCard, {
      data: {
        relations: sampleRelations,
        searchTerm: 'Cadeira',
        searchResults: sampleSearchResults,
      },
      actions: {
        onSearchChange,
        onAddRelation,
        onRemoveRelation: vi.fn(),
      },
    });

    expect(screen.getByText('CH-0025')).toBeInTheDocument();
    expect(screen.getByText('Cadeira com defeito no pistão')).toBeInTheDocument();

    const linkBtn = screen.getByRole('button', { name: 'Vincular' });
    await userEvent.click(linkBtn);

    expect(onAddRelation).toHaveBeenCalledWith(25);
  });

  it('shows error message if present', () => {
    render(TicketRelationsCard, {
      data: { relations: [] },
      state: { error: 'Estes chamados já estão vinculados.' },
      actions: {
        onSearchChange: vi.fn(),
        onAddRelation: vi.fn(),
        onRemoveRelation: vi.fn(),
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/já estão vinculados/);
  });
});
