import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ProjectListView, { type AzuosProjectListViewProps } from './azuos-project-list-view.svelte';

const project: SoftwareProject = {
  id: 1,
  name: 'Azuos Ticket',
  description: 'Sistema central de chamados',
  repositoryUrl: 'vinicius-gpl/acerola-ticket',
  githubRepoOwner: 'vinicius-gpl',
  githubRepoName: 'azuos-ticket',
  responsibleId: null,
  responsibleName: null,
  status: 'active',
  color: 'blue',
  openTicketsCount: 3,
  pullRequestsCount: 7,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: null,
};

function renderView(
  overrides: {
    data?: Partial<AzuosProjectListViewProps['data']>;
    state?: Partial<AzuosProjectListViewProps['state']>;
  } = {},
) {
  const actions = {
    onSearchChange: vi.fn(),
    onStatusChange: vi.fn(),
    onClearFilters: vi.fn(),
    onRetry: vi.fn(),
    onRegister: vi.fn(),
    onEdit: vi.fn(),
    onViewTimeline: vi.fn(),
    onAskDelete: vi.fn(),
    onCancelDelete: vi.fn(),
    onConfirmDelete: vi.fn(),
    onSyncGithub: vi.fn(),
    onSyncAllGithub: vi.fn(),
  };

  render(ProjectListView, {
    props: {
      data: {
        items: [project],
        total: 1,
        filter: { search: '', status: '' },
        deleting: null,
        ...overrides.data,
      },
      state: {
        isLoading: false,
        isEmpty: false,
        isFilteredOut: false,
        isDeleting: false,
        isSyncing: false,
        error: null,
        deleteError: null,
        syncMessage: null,
        ...overrides.state,
      },
      actions,
    },
  });

  return actions;
}

describe('AzuosProjectListView', () => {
  it('keeps team history accessible while hiding edit actions for managers', async () => {
    const actions = renderView({ state: { canEdit: false } });
    expect(screen.queryByRole('button', { name: /novo sistema/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sincronizar/i })).not.toBeInTheDocument();
    expect(screen.queryByTitle('Editar')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Excluir')).not.toBeInTheDocument();
    /* O botão virou "Ver sistema" quando a página de cada sistema nasceu (a timeline mora nela). */
    await userEvent.click(screen.getByRole('button', { name: /ver sistema/i }));
    expect(actions.onViewTimeline).toHaveBeenCalledWith(project);
  });
  // feliz
  it('renders project list and counters correctly', () => {
    renderView();

    expect(screen.getByText('Azuos Ticket')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('triggers register action on clicking Novo Sistema', async () => {
    const actions = renderView();

    const newBtn = screen.getByRole('button', { name: /novo sistema/i });
    await userEvent.click(newBtn);

    expect(actions.onRegister).toHaveBeenCalled();
  });

  it('triggers sync action on clicking Sincronizar', async () => {
    const actions = renderView();

    const syncBtn = screen.getByRole('button', { name: /sincronizar/i });
    await userEvent.click(syncBtn);

    expect(actions.onSyncGithub).toHaveBeenCalledWith(1);
  });

  // feliz
  it('lets a super administrator sync every project at once', async () => {
    const actions = renderView({ state: { canSyncAll: true } });

    await userEvent.click(screen.getByRole('button', { name: /sincronizar todos/i }));

    expect(actions.onSyncAllGithub).toHaveBeenCalledOnce();
  });

  // triste
  it('hides Sincronizar todos from anyone who is not a super administrator', () => {
    renderView({ state: { canSyncAll: false } });

    expect(screen.queryByRole('button', { name: /sincronizar todos/i })).not.toBeInTheDocument();
  });

  // triste
  it('blocks a second click while every project is still syncing', () => {
    renderView({ state: { canSyncAll: true, isSyncingAll: true } });

    expect(screen.getByRole('button', { name: /sincronizando/i })).toBeDisabled();
  });

  // triste
  it('shows error state when query fails', () => {
    renderView({
      data: { items: [], total: 0 },
      state: { error: 'Erro ao carregar dados' },
    });

    expect(screen.getByText(/não foi possível carregar os sistemas/i)).toBeInTheDocument();
  });

  it('shows empty state when there are no registered projects', () => {
    renderView({
      data: { items: [], total: 0 },
      state: { isEmpty: true },
    });

    expect(screen.getByText(/nenhum sistema cadastrado/i)).toBeInTheDocument();
  });
});

describe('AzuosProjectListView — messages, filters, cards and deletion', () => {
  // feliz
  it('shows the sync message and the sync failure', () => {
    renderView({ state: { syncMessage: 'Sincronizado.', syncError: 'GitHub indisponível.' } });
    expect(screen.getByText('Sincronizado.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('GitHub indisponível.');
  });

  // triste
  it('shows placeholders while loading and offers to clear a filter that hid everything', async () => {
    renderView({ state: { isLoading: true } });
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(3);
    cleanup();
    const actions = renderView({ state: { isFilteredOut: true } });
    await userEvent.click(screen.getByRole('button', { name: 'Limpar Filtros' }));
    expect(actions.onClearFilters).toHaveBeenCalledOnce();
  });

  // triste
  it('tells a manager to wait for an administrator when there is nothing registered', () => {
    renderView({ state: { isEmpty: true, canEdit: false } });
    expect(screen.getByText('Aguarde um administrador cadastrar os sistemas da equipe.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cadastrar Sistema' })).not.toBeInTheDocument();
  });

  // feliz
  it('searches and filters by situation', async () => {
    const actions = renderView();
    await userEvent.type(screen.getByRole('textbox', { name: 'Buscar' }), 'P');
    expect(actions.onSearchChange).toHaveBeenCalledWith('P');
    const status = screen.getByRole('combobox', { name: 'Filtrar por situação' });
    await fireEvent.pointerDown(status);
    await fireEvent.click(status);
    await fireEvent.pointerUp(await screen.findByRole('option', { name: 'Manutenção' }));
    expect(actions.onStatusChange).toHaveBeenCalledWith('maintenance');
  });

  // feliz
  it('opens, edits and asks to delete a project from its card', async () => {
    const actions = renderView({
      data: {
        items: [
          { ...project, description: null, responsibleName: 'Ana Lima', repositoryUrl: 'https://github.com/example/portal', githubRepoOwner: null, githubRepoName: null, status: 'maintenance' },
        ],
      },
    });
    expect(screen.getByText('Sem descrição cadastrada.')).toBeInTheDocument();
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://github.com/example/portal');
    await userEvent.click(screen.getByRole('button', { name: 'Ver sistema' }));
    expect(actions.onViewTimeline).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    await userEvent.click(screen.getByTitle('Editar'));
    expect(actions.onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    await userEvent.click(screen.getByTitle('Excluir'));
    expect(actions.onAskDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  // feliz
  it('confirms or cancels the deletion in the dialog', async () => {
    const actions = renderView({ data: { deleting: project } });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Tem certeza que deseja excluir "Azuos Ticket"?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));
    expect(actions.onConfirmDelete).toHaveBeenCalledOnce();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(actions.onCancelDelete).toHaveBeenCalledOnce();
  });
});
