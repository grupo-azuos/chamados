import { fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import SystemKanbanView, {
  type AzuosSystemKanbanViewProps,
  columnDropId,
  moveOfDrop,
} from './azuos-system-kanban-view.svelte';

/* O jsdom não tem as animações, a camada de cima (popover) nem o "o que está neste ponto" do
   navegador, que o arrasto usa: aqui eles não fazem nada. */
beforeAll(() => {
  const noAnimations = () => [];
  Object.assign(document, { getAnimations: noAnimations, elementFromPoint: () => null });
  Object.assign(Element.prototype, { getAnimations: noAnimations });
  Object.assign(HTMLElement.prototype, { showPopover() {}, hidePopover() {} });
});

const COLUMNS_WITHOUT_TICKETS: AzuosSystemKanbanViewProps['data']['columns'] = [
  { id: 'in_progress', title: 'Em Atendimento', tickets: [] },
  { id: 'waiting', title: 'Aguardando Terceiros', tickets: [] },
  { id: 'done', title: 'Resolvidos', tickets: [] },
];

function renderView(
  overrides: {
    data?: Partial<AzuosSystemKanbanViewProps['data']>;
    state?: Partial<AzuosSystemKanbanViewProps['state']>;
  } = {},
) {
  const actions = {
    onSelectProject: vi.fn(),
    onRetry: vi.fn(),
    onOpenTicket: vi.fn(),
    onMoveTicket: vi.fn().mockResolvedValue(undefined),
    onSetCardColor: vi.fn(),
  };

  render(SystemKanbanView, {
    props: {
      data: {
        cardColors: {},
        assigneePhotos: { 'u-carlos': 'https://cdn.example/carlos.png' },
        columns: [
          {
            id: 'todo',
            title: 'Abertos',
            tickets: [
              {
                id: 10,
                protocol: 'CH-0010',
                description: 'Bug no login',
                priority: 'high',
                projectName: 'Azuos Ticket',
                requesterName: 'Ana',
                assignee: 'Carlos Dev',
                assigneeId: 'u-carlos',
                githubIssueNumber: 42,
                githubIssueUrl: 'https://github.com/issue/42',
                createdAt: '2026-10-06T12:00:00.000Z',
              } as never,
            ],
          },
          ...COLUMNS_WITHOUT_TICKETS,
        ],
        projects: [
          {
            id: 1,
            name: 'Azuos Ticket',
            description: null,
            repositoryUrl: 'owner/repo',
            githubRepoOwner: 'owner',
            githubRepoName: 'repo',
            responsibleId: null,
            responsibleName: null,
            status: 'active',
            color: 'blue',
            openTicketsCount: 1,
            pullRequestsCount: 0,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: null,
            archive: null,
          },
        ],
        selectedProjectId: null,
        totalTickets: 1,
        ...overrides.data,
      },
      state: { isLoading: false, isEmpty: false, error: null, ...overrides.state },
      actions,
    },
  });

  return actions;
}

it('searches systems and restores the all-systems filter', async () => {
  const actions = renderView();
  await userEvent.click(screen.getByRole('button', { name: 'Filtrar por sistema' }));
  const search = await screen.findByPlaceholderText('Buscar sistema…');
  const popup = search.closest('[data-slot="popover-content"]') as HTMLElement;
  await fireEvent.input(search, { target: { value: 'azuos' } });
  expect(within(popup).queryByText('Todos os sistemas')).not.toBeInTheDocument();
  await fireEvent.click(within(popup).getByText('Azuos Ticket'));
  expect(actions.onSelectProject).toHaveBeenCalledWith(1);
  await userEvent.click(screen.getByRole('button', { name: 'Filtrar por sistema' }));
  const reopenedSearch = await screen.findByPlaceholderText('Buscar sistema…');
  const reopenedPopup = reopenedSearch.closest('[data-slot="popover-content"]') as HTMLElement;
  await fireEvent.click(within(reopenedPopup).getByText('Todos os sistemas'));
  expect(actions.onSelectProject).toHaveBeenLastCalledWith(null);
});

describe('AzuosSystemKanbanView', () => {
  // feliz
  it('renders the stage columns and the ticket card with its assignee photo', () => {
    renderView();

    expect(screen.getByRole('heading', { name: 'Abertos' })).toBeInTheDocument();
    expect(screen.getByText('CH-0010')).toBeInTheDocument();
    expect(screen.getByText('Bug no login')).toBeInTheDocument();
    expect(screen.getByText('#42')).toBeInTheDocument();
    expect(screen.getByText('Carlos Dev')).toBeInTheDocument();
    expect(screen.getAllByText('Arraste para cá.')).toHaveLength(3);
  });

  it('opens the ticket from the card', async () => {
    const actions = renderView();

    await userEvent.click(screen.getByRole('button', { name: 'Abrir o chamado CH-0010' }));

    expect(actions.onOpenTicket).toHaveBeenCalledWith(10);
  });

  it('labels a ticket from the menu and shows the chosen label', async () => {
    const user = userEvent.setup();
    const actions = renderView({ data: { cardColors: { 10: 'warning' } } });
    expect(screen.getByText('Atenção')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Etiqueta do chamado CH-0010' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Urgente' }));

    expect(actions.onSetCardColor).toHaveBeenCalledWith(10, 'danger');
  });

  it('opens the board on the full screen', async () => {
    renderView();

    await userEvent.click(screen.getByRole('button', { name: 'Expandir o quadro' }));

    expect(await screen.findByText('Quadro dos chamados')).toBeInTheDocument();
  });

  // triste
  it('displays error state and allows retry', async () => {
    const actions = renderView({ state: { error: 'Erro de conexão' } });

    expect(screen.getByText(/não foi possível carregar o kanban/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /tentar de novo/i }));
    expect(actions.onRetry).toHaveBeenCalled();
  });

  it('displays empty state when there is no ticket', () => {
    renderView({ data: { totalTickets: 0 }, state: { isEmpty: true } });

    expect(screen.getByText(/nenhum chamado no kanban/i)).toBeInTheDocument();
  });

  it('shows only placeholders while loading', () => {
    renderView({ state: { isLoading: true } });

    expect(screen.queryByRole('region', { name: 'Abertos' })).not.toBeInTheDocument();
  });
});

const BOARD: AzuosSystemKanbanViewProps['data']['columns'] = [
  { id: 'todo', title: 'Abertos', tickets: [{ id: 10 } as never] },
  ...COLUMNS_WITHOUT_TICKETS,
];

describe('moveOfDrop', () => {
  // feliz
  it('moves the ticket to the stage of the column it was dropped on', () => {
    expect(moveOfDrop({ sourceId: 10, targetId: columnDropId('waiting') }, BOARD)).toEqual({
      ticketId: 10,
      columnId: 'waiting',
    });
  });

  // triste
  it('asks nothing when dropped outside a column, on its own column or on something else', () => {
    expect(moveOfDrop({ sourceId: 10, targetId: undefined }, BOARD)).toBeNull();
    expect(moveOfDrop({ sourceId: 10, targetId: columnDropId('todo') }, BOARD)).toBeNull();
    expect(moveOfDrop({ sourceId: 10, targetId: 11 }, BOARD)).toBeNull();
    expect(moveOfDrop({ sourceId: 10, targetId: 'column:nada' }, BOARD)).toBeNull();
    expect(moveOfDrop({ sourceId: 99, targetId: columnDropId('done') }, BOARD)).toBeNull();
  });
});

describe('AzuosSystemKanbanView: drag and drop', () => {
  // feliz
  it('lets the keyboard pick a card up, and giving it back moves nothing', async () => {
    const actions = renderView();
    const card = screen.getByRole('button', { name: 'Mover o chamado CH-0010' });

    card.focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{Escape}');

    expect(actions.onMoveTicket).not.toHaveBeenCalled();
    expect(actions.onOpenTicket).not.toHaveBeenCalled();
  });

  // triste
  it('does not let a card be dragged while a move is going to the server', () => {
    renderView({ state: { isMoving: true } });

    expect(screen.getByRole('button', { name: 'Mover o chamado CH-0010' })).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('AzuosSystemKanbanView: notices and the issue link', () => {
  // feliz
  it('shows the move notice and lets the person dismiss it', async () => {
    const onClearMoveError = vi.fn();
    render(SystemKanbanView, {
      props: {
        data: { cardColors: {}, columns: [], projects: [], selectedProjectId: 2, totalTickets: 0 },
        state: { isLoading: true, isEmpty: true, error: null, moveError: 'Não pode voltar.' },
        actions: {
          onSelectProject: vi.fn(),
          onRetry: vi.fn(),
          onOpenTicket: vi.fn(),
          onMoveTicket: vi.fn().mockResolvedValue(undefined),
          onSetCardColor: vi.fn(),
          onClearMoveError,
        },
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Não pode voltar.');
    await fireEvent.click(screen.getByTitle('Fechar aviso'));
    expect(onClearMoveError).toHaveBeenCalled();
  });

  it('opens the GitHub issue without opening the ticket', async () => {
    const actions = renderView();

    const issue = screen.getByRole('link', { name: /#42/ });
    issue.addEventListener('click', (event) => event.preventDefault());
    await userEvent.click(issue);

    expect(actions.onOpenTicket).not.toHaveBeenCalled();
  });

  // triste
  it('keeps the notice without a close button when nothing can dismiss it', () => {
    renderView({ state: { moveError: 'Aviso fixo.' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Aviso fixo.');
    expect(screen.queryByTitle('Fechar aviso')).not.toBeInTheDocument();
  });

  it('shows the initials when the assignee has no photo', () => {
    renderView({ data: { assigneePhotos: undefined } });

    expect(screen.getByText('CD')).toBeInTheDocument();
  });
});
