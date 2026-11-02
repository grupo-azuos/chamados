import { fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import SystemKanbanView, {
  type AzuosSystemKanbanViewProps,
} from './azuos-system-kanban-view.svelte';

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
        columns: [
          {
            id: 'todo',
            title: 'Abertos',
            tickets: [
              {
                id: 10,
                protocol: 'CH-0010',
                title: 'Bug no login',
                description: 'Bug no login',
                priority: 'high',
                projectName: 'Azuos Ticket',
                requesterName: 'Ana',
                githubIssueNumber: 42,
                githubIssueUrl: 'https://github.com/issue/42',
                createdAt: '2026-10-06T12:00:00.000Z',
              } as any,
            ],
          },
          { id: 'in_progress', title: 'Em Atendimento', tickets: [] },
          { id: 'waiting', title: 'Aguardando Terceiros', tickets: [] },
          { id: 'done', title: 'Resolvidos', tickets: [] },
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
          },
        ],
        selectedProjectId: null,
        totalTickets: 1,
        ...overrides.data,
      },
      state: {
        isLoading: false,
        isEmpty: false,
        error: null,
        ...overrides.state,
      },
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
  it('moves a ticket using the stage selector without opening its details', async () => {
    const actions = renderView();
    const trigger = screen.getByRole('combobox', { name: 'Mover CH-0010 para' });
    await fireEvent.pointerDown(trigger);
    await fireEvent.click(trigger);
    await fireEvent.pointerUp(await screen.findByRole('option', { name: 'Em Atendimento' }));
    expect(actions.onMoveTicket).toHaveBeenCalledWith(10, 'in_progress');
    expect(actions.onOpenTicket).not.toHaveBeenCalled();
  });

  it('disables the stage selector while a move is pending', () => {
    renderView({ state: { isMoving: true } });
    expect(screen.getByRole('combobox', { name: 'Mover CH-0010 para' })).toBeDisabled();
  });

  // feliz
  it('renders kanban columns and ticket card', () => {
    renderView();

    expect(screen.getByRole('heading', { name: 'Abertos' })).toBeInTheDocument();
    expect(screen.getByText('CH-0010')).toBeInTheDocument();
    expect(screen.getByText('Bug no login')).toBeInTheDocument();
    expect(screen.getByText('#42')).toBeInTheDocument();
  });

  it('triggers onOpenTicket when ticket card is clicked', async () => {
    const actions = renderView();

    const card = screen.getByText('CH-0010');
    await userEvent.click(card);

    expect(actions.onOpenTicket).toHaveBeenCalledWith(10);
  });

  // triste
  it('displays error state and allows retry', async () => {
    const actions = renderView({
      state: { error: 'Erro de conexão' },
    });

    expect(screen.getByText(/não foi possível carregar o kanban/i)).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /tentar de novo/i });
    await userEvent.click(retryBtn);
    expect(actions.onRetry).toHaveBeenCalled();
  });

  it('displays empty state when total tickets is 0', () => {
    renderView({
      data: {
        columns: [
          { id: 'todo', title: 'Abertos', tickets: [] },
          { id: 'in_progress', title: 'Em Atendimento', tickets: [] },
          { id: 'waiting', title: 'Aguardando Terceiros', tickets: [] },
          { id: 'done', title: 'Resolvidos', tickets: [] },
        ],
        totalTickets: 0,
      },
      state: { isEmpty: true },
    });

    expect(screen.getByText(/nenhum chamado no kanban/i)).toBeInTheDocument();
  });
});

/** O `dataTransfer` que o navegador manda num arrasto — o jsdom não cria um. */
function dataTransfer(payload: Record<string, string> = {}) {
  return {
    effectAllowed: '',
    dropEffect: '',
    setData: (type: string, value: string) => {
      payload[type] = value;
    },
    getData: (type: string) => payload[type] ?? '',
  };
}

describe('AzuosSystemKanbanView: drag and drop', () => {
  // feliz
  it('moves the card to the column it was dropped on', async () => {
    const actions = renderView();
    const card = screen.getByRole('button', { name: /CH-0010/ });
    const target = screen.getByRole('region', { name: 'Em Atendimento' });
    const transfer = dataTransfer();

    await fireEvent.dragStart(card, { dataTransfer: transfer });
    await fireEvent.dragEnter(target, { dataTransfer: transfer });
    await fireEvent.dragOver(target, { dataTransfer: transfer });
    expect(screen.getByText('Solte aqui para mover para Em Atendimento')).toBeInTheDocument();

    await fireEvent.drop(target, { dataTransfer: transfer });

    expect(actions.onMoveTicket).toHaveBeenCalledWith(10, 'in_progress');
    /* Logo depois de arrastar, o clique que o navegador dispara não abre o chamado. */
    await fireEvent.click(card);
    expect(actions.onOpenTicket).not.toHaveBeenCalled();
  });

  it('clears the highlight when the card leaves the column, and on drag end', async () => {
    renderView();
    const card = screen.getByRole('button', { name: /CH-0010/ });
    const target = screen.getByRole('region', { name: 'Aguardando Terceiros' });

    await fireEvent.dragStart(card);
    await fireEvent.dragEnter(target);
    await fireEvent.dragEnter(target);
    await fireEvent.dragLeave(target);
    expect(screen.getByText(/Solte aqui/)).toBeInTheDocument();
    await fireEvent.dragLeave(target);
    expect(screen.queryByText(/Solte aqui/)).not.toBeInTheDocument();

    await fireEvent.dragEnd(card);
    expect(screen.getAllByText('Arraste um card para cá')).toHaveLength(3);
  });

  // triste
  it('falls back to the dragged card when the drop carries no data, and ignores garbage', async () => {
    const actions = renderView();
    const card = screen.getByRole('button', { name: /CH-0010/ });
    const target = screen.getByRole('region', { name: 'Resolvidos' });

    await fireEvent.dragStart(card);
    await fireEvent.drop(target);
    expect(actions.onMoveTicket).toHaveBeenCalledWith(10, 'done');

    await fireEvent.drop(target, { dataTransfer: dataTransfer({ 'text/plain': 'x' }) });
    expect(actions.onMoveTicket).toHaveBeenCalledTimes(1);
  });
});

describe('AzuosSystemKanbanView: labels, keyboard and notices', () => {
  // feliz
  it('labels a card with a tone and shows the badge of the chosen tone', async () => {
    const actions = renderView({ data: { cardColors: { 10: 'warning' } } });
    expect(screen.getByText('Atenção')).toBeInTheDocument();

    await fireEvent.click(screen.getByTitle('Atribuir etiqueta ao card'));
    const picker = screen.getByRole('dialog');
    await fireEvent.click(within(picker).getByRole('button', { name: /Urgente/ }));

    expect(actions.onSetCardColor).toHaveBeenCalledWith(10, 'danger');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(actions.onOpenTicket).not.toHaveBeenCalled();
  });

  it('closes the label picker with Escape or by clicking the tag again', async () => {
    renderView();
    const tag = screen.getByTitle('Atribuir etiqueta ao card');

    await fireEvent.click(tag);
    await fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await fireEvent.click(tag);
    await fireEvent.click(screen.getByRole('dialog'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await fireEvent.click(tag);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the ticket with Enter or Space on the card', async () => {
    const actions = renderView();
    const card = screen.getByRole('button', { name: /CH-0010/ });

    await fireEvent.keyDown(card, { key: 'Enter' });
    await fireEvent.keyDown(card, { key: ' ' });
    await fireEvent.keyDown(card, { key: 'a' });

    expect(actions.onOpenTicket).toHaveBeenCalledTimes(2);
  });

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

  // triste
  it('shows a card without a system, an issue or a known priority', () => {
    renderView({
      data: {
        columns: [
          {
            id: 'todo',
            title: 'Abertos',
            tickets: [
              {
                id: 11,
                protocol: 'CH-0011',
                description: 'Sem sistema',
                priority: 'urgentissima',
                requesterName: 'Bia',
                githubIssueNumber: null,
                githubIssueUrl: null,
              } as never,
            ],
          },
          { id: 'in_progress', title: 'Em Atendimento', tickets: [] },
          { id: 'waiting', title: 'Aguardando Terceiros', tickets: [] },
          { id: 'done', title: 'Resolvidos', tickets: [] },
        ],
      },
    });

    expect(screen.getByText('urgentissima')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('keeps the notice without a close button when nothing can dismiss it', () => {
    renderView({ state: { moveError: 'Aviso fixo.' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Aviso fixo.');
    expect(screen.queryByTitle('Fechar aviso')).not.toBeInTheDocument();
  });
});
