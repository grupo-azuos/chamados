import CircleDot from '@lucide/svelte/icons/circle-dot';
import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TicketCard, {
  subjectOf,
  type AzuosTicketKanbanCardProps,
} from './azuos-ticket-kanban-card.svelte';

function ticket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 10,
    protocol: 'CH-0010',
    status: 'open',
    priority: 'high',
    requesterName: 'Ana Souza',
    area: 'sistema',
    department: 'Comercial',
    problemType: 'bug',
    participantAreas: [],
    anydeskId: null,
    contactPhone: null,
    notifyWhatsapp: false,
    description: 'Erro na autenticação do sistema',
    screenshotUrl: null,
    computerId: null,
    computerName: null,
    projectId: 1,
    projectName: 'Azuos Ticket',
    githubIssueNumber: 42,
    githubIssueUrl: 'https://github.com/issue/42',
    assignee: 'Carlos Dev',
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

function renderCard(
  overrides: {
    data?: Partial<AzuosTicketKanbanCardProps['data']>;
    state?: AzuosTicketKanbanCardProps['state'];
  } = {},
) {
  const actions = { onOpen: vi.fn(), onSetLabel: vi.fn() };
  render(TicketCard, {
    props: {
      data: {
        ticket: ticket(),
        label: null,
        assigneePhoto: null,
        ...overrides.data,
      },
      ui: { icon: CircleDot, tone: 'neutral', stageLabel: 'Em atendimento' },
      state: overrides.state,
      actions,
    },
  });

  return actions;
}

describe('AzuosTicketKanbanCard', () => {
  // feliz
  it('shows the ticket text, chips, protocol and the assignee', () => {
    renderCard({ data: { label: 'warning' } });

    expect(screen.getByText('Erro na autenticação do sistema')).toBeInTheDocument();
    expect(screen.getByText('Azuos Ticket')).toBeInTheDocument();
    expect(screen.getByText('Alta')).toBeInTheDocument();
    expect(screen.getByText('Atenção')).toBeInTheDocument();
    expect(screen.getByText('CH-0010')).toBeInTheDocument();
    expect(screen.getByText('Carlos Dev')).toBeInTheDocument();
    /* A faixa de cima, como no paralegal: a etapa em que o cartão está. */
    expect(screen.getByText('Em atendimento')).toBeInTheDocument();
    const issue = screen.getByRole('link', { name: /#42/ });
    expect(issue).toHaveAttribute('target', '_blank');
    expect(issue).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('opens the ticket from the card', async () => {
    const actions = renderCard();

    await userEvent.click(screen.getByRole('button', { name: 'Abrir o chamado CH-0010' }));

    expect(actions.onOpen).toHaveBeenCalledWith(10);
  });

  it('labels the ticket from the three-dot menu without opening it', async () => {
    const user = userEvent.setup();
    const actions = renderCard();

    await user.click(screen.getByRole('button', { name: 'Etiqueta do chamado CH-0010' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Destaque' }));

    expect(actions.onSetLabel).toHaveBeenCalledWith(10, 'brand');
    expect(actions.onOpen).not.toHaveBeenCalled();
  });

  it('labels the ticket from the menu with the keyboard', async () => {
    const user = userEvent.setup();
    const actions = renderCard();

    screen.getByRole('button', { name: 'Etiqueta do chamado CH-0010' }).focus();
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Destaque' })).toHaveFocus());
    await user.click(screen.getByRole('menuitem', { name: 'Urgente' }));

    expect(actions.onSetLabel).toHaveBeenCalledWith(10, 'danger');
  });

  /* Fora de Sistema não há sistema: o selo diz do que é o chamado pelo tipo de problema. */
  it('names a ticket of another area by its kind of problem', () => {
    renderCard({
      data: {
        ticket: ticket({
          area: 'manutencao',
          problemType: 'air_conditioning' as never,
          projectId: null,
          projectName: null,
          githubIssueNumber: null,
          githubIssueUrl: null,
        }),
      },
    });

    expect(
      screen.getByText(
        subjectOf(ticket({ projectName: null, problemType: 'air_conditioning' as never })),
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  // triste
  it('shows a ticket without system, issue, assignee or a known priority', () => {
    renderCard({
      data: {
        ticket: ticket({
          projectName: null,
          customSystemName: null,
          githubIssueNumber: null,
          githubIssueUrl: null,
          assignee: null,
          assigneeId: null,
          priority: 'urgentissima' as never,
        }),
        label: 'neutral',
      },
    });

    expect(screen.getByText('urgentissima')).toBeInTheDocument();
    expect(screen.getByText('Sem responsável')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText('Padrão')).not.toBeInTheDocument();
  });

  it('locks the menu and says it is saving while the move goes to the server', async () => {
    const user = userEvent.setup();
    renderCard({ state: { isBusy: true } });

    expect(screen.getByText('Salvando…')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Etiqueta do chamado CH-0010' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('is only a drawing when it gets no actions', () => {
    render(TicketCard, {
      props: {
        data: {
          ticket: ticket({ customSystemName: 'Planilha do RH', projectName: null }),
          label: null,
          assigneePhoto: null,
        },
        ui: { icon: CircleDot, tone: 'neutral' },
      },
    });

    expect(screen.getByText('Planilha do RH')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
