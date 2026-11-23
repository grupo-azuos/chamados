import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import TicketKanbanBoard, {
  type AzuosTicketKanbanBoardProps,
  columnDropId,
  isReadOnlyBoard,
  moveOfDrop,
} from './azuos-ticket-kanban-board.svelte';

/* O jsdom não tem as animações, a camada de cima (popover) nem o "o que está neste ponto" do
   navegador, que o arrasto usa: aqui eles não fazem nada. */
beforeAll(() => {
  const noAnimations = () => [];
  Object.assign(document, { getAnimations: noAnimations, elementFromPoint: () => null });
  Object.assign(Element.prototype, { getAnimations: noAnimations });
  Object.assign(HTMLElement.prototype, { showPopover() {}, hidePopover() {} });
});

const COLUMNS_WITHOUT_TICKETS: AzuosTicketKanbanBoardProps['data']['columns'] = [
  { id: 'working', title: 'Em atendimento', tickets: [] },
  { id: 'waiting', title: 'Aguardando', tickets: [] },
  { id: 'closed', title: 'Concluído', tickets: [] },
];

const CARD = {
  id: 10,
  protocol: 'CH-0010',
  description: 'Bug no login',
  priority: 'high',
  area: 'sistema',
  problemType: 'bug',
  projectName: 'Azuos Ticket',
  requesterName: 'Ana',
  assignee: 'Carlos Dev',
  assigneeId: 'u-carlos',
  githubIssueNumber: 42,
  githubIssueUrl: 'https://github.com/issue/42',
  createdAt: '2026-10-06T12:00:00.000Z',
} as never;

function renderBoard(
  overrides: {
    data?: Partial<AzuosTicketKanbanBoardProps['data']>;
    state?: AzuosTicketKanbanBoardProps['state'];
    actions?: Partial<AzuosTicketKanbanBoardProps['actions']>;
  } = {},
) {
  const actions = {
    onOpenTicket: vi.fn(),
    onMoveTicket: vi.fn().mockResolvedValue(undefined),
    onSetCardColor: vi.fn(),
    ...overrides.actions,
  };

  render(TicketKanbanBoard, {
    props: {
      data: {
        cardColors: {},
        assigneePhotos: { 'u-carlos': 'https://cdn.example/carlos.png' },
        columns: [{ id: 'queue', title: 'A fazer / triagem', tickets: [CARD] }, ...COLUMNS_WITHOUT_TICKETS],
        ...overrides.data,
      },
      state: overrides.state,
      actions,
    },
  });

  return actions;
}

describe('AzuosTicketKanbanBoard', () => {
  // feliz
  it('renders the stage columns and the ticket card with its assignee', () => {
    renderBoard();

    expect(screen.getByRole('heading', { name: 'A fazer / triagem' })).toBeInTheDocument();
    expect(screen.getByText('CH-0010')).toBeInTheDocument();
    expect(screen.getByText('Bug no login')).toBeInTheDocument();
    expect(screen.getByText('#42')).toBeInTheDocument();
    expect(screen.getByText('Carlos Dev')).toBeInTheDocument();
    expect(screen.getAllByText('Arraste para cá.')).toHaveLength(3);
  });

  it('opens the ticket from the card', async () => {
    const actions = renderBoard();

    await userEvent.click(screen.getByRole('button', { name: 'Abrir o chamado CH-0010' }));

    expect(actions.onOpenTicket).toHaveBeenCalledWith(10);
  });

  it('labels a ticket from the menu and shows the chosen label', async () => {
    const user = userEvent.setup();
    const actions = renderBoard({ data: { cardColors: { 10: 'warning' } } });
    expect(screen.getByText('Atenção')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Etiqueta do chamado CH-0010' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Urgente' }));

    expect(actions.onSetCardColor).toHaveBeenCalledWith(10, 'danger');
  });

  it('opens the board on the full screen', async () => {
    renderBoard();

    await userEvent.click(screen.getByRole('button', { name: 'Expandir o quadro' }));

    expect(await screen.findByText('Quadro dos chamados')).toBeInTheDocument();
  });

  it('opens the GitHub issue without opening the ticket', async () => {
    const actions = renderBoard();

    const issue = screen.getByRole('link', { name: /#42/ });
    issue.addEventListener('click', (event) => event.preventDefault());
    await userEvent.click(issue);

    expect(actions.onOpenTicket).not.toHaveBeenCalled();
  });

  it('shows the move notice and lets the person dismiss it', async () => {
    const onClearMoveError = vi.fn();
    renderBoard({ state: { moveError: 'Não pode voltar.' }, actions: { onClearMoveError } });

    expect(screen.getByRole('alert')).toHaveTextContent('Não pode voltar.');
    await fireEvent.click(screen.getByTitle('Fechar aviso'));
    expect(onClearMoveError).toHaveBeenCalled();
  });

  // triste
  it('keeps the notice without a close button when nothing can dismiss it', () => {
    renderBoard({ state: { moveError: 'Aviso fixo.' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Aviso fixo.');
    expect(screen.queryByTitle('Fechar aviso')).not.toBeInTheDocument();
  });

  it('shows the initials when the assignee has no photo', () => {
    renderBoard({ data: { assigneePhotos: undefined } });

    expect(screen.getByText('CD')).toBeInTheDocument();
  });

  /* Quem só consulta a área vê o quadro, mas nada se arrasta — e a tela diz por quê. */
  it('locks the cards of who only reads the area, saying so', () => {
    renderBoard({ data: { lockedTicketIds: [10] } });

    expect(screen.getByRole('button', { name: 'Mover o chamado CH-0010' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByText(/só de consulta/)).toBeInTheDocument();
    expect(screen.getAllByText('Nada nesta etapa.')).toHaveLength(3);
  });
});

const BOARD: AzuosTicketKanbanBoardProps['data']['columns'] = [
  { id: 'queue', title: 'A fazer / triagem', tickets: [{ id: 10 } as never] },
  ...COLUMNS_WITHOUT_TICKETS,
];

describe('moveOfDrop', () => {
  // feliz
  it('moves the ticket to the stage of the column it was dropped on', () => {
    expect(moveOfDrop({ sourceId: 10, targetId: columnDropId('closed') }, BOARD)).toEqual({
      ticketId: 10,
      columnId: 'closed',
    });
  });

  // triste
  it('asks nothing when dropped outside a column, on its own column or on something else', () => {
    expect(moveOfDrop({ sourceId: 10, targetId: undefined }, BOARD)).toBeNull();
    expect(moveOfDrop({ sourceId: 10, targetId: columnDropId('queue') }, BOARD)).toBeNull();
    expect(moveOfDrop({ sourceId: 10, targetId: 11 }, BOARD)).toBeNull();
    expect(moveOfDrop({ sourceId: 10, targetId: 'column:nada' }, BOARD)).toBeNull();
    expect(moveOfDrop({ sourceId: 99, targetId: columnDropId('closed') }, BOARD)).toBeNull();
  });
});

describe('isReadOnlyBoard', () => {
  // feliz
  it('is read-only only when every card on the board is locked', () => {
    expect(isReadOnlyBoard(BOARD, [10])).toBe(true);
  });

  // triste
  it('is not read-only when a card can move, nor on an empty board', () => {
    expect(isReadOnlyBoard(BOARD, [])).toBe(false);
    expect(isReadOnlyBoard(COLUMNS_WITHOUT_TICKETS, [])).toBe(false);
  });
});

describe('AzuosTicketKanbanBoard: drag and drop', () => {
  // feliz
  it('lets the keyboard pick a card up, and giving it back moves nothing', async () => {
    const actions = renderBoard();
    const card = screen.getByRole('button', { name: 'Mover o chamado CH-0010' });

    card.focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{Escape}');

    expect(actions.onMoveTicket).not.toHaveBeenCalled();
    expect(actions.onOpenTicket).not.toHaveBeenCalled();
  });

  // triste
  it('does not let a card be dragged while a move is going to the server', () => {
    renderBoard({ state: { isMoving: true } });

    expect(screen.getByRole('button', { name: 'Mover o chamado CH-0010' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});
