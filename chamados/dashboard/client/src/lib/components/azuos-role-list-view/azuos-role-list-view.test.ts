import { type InternalRole } from '@template/shared/schemas/internal-role.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import RoleListView, {
  groupRolesByPerson,
  type AzuosRoleListViewProps,
} from './azuos-role-list-view.svelte';

const mockRoles: InternalRole[] = [
  {
    id: 1,
    userId: 'usr_1',
    userEmail: 'vinicius@empresa.com.br',
    context: 'infra',
    createdAt: '2026-10-01T12:00:00.000Z',
    createdBy: 'admin@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
  },
  {
    id: 2,
    userId: 'usr_1',
    userEmail: 'vinicius@empresa.com.br',
    context: 'sistema',
    createdAt: '2026-10-01T12:00:00.000Z',
    createdBy: 'admin@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
  },
];

/* Ver `azuos-person-avatar.test.ts`: sem isto o jsdom nunca "carrega" a foto. */
class InstantLoadImage {
  complete = false;
  naturalWidth = 0;
  addEventListener(type: string, listener: () => void) {
    if (type === 'load') listener();
  }
  removeEventListener() {}
  set src(_value: string) {
    this.complete = true;
    this.naturalWidth = 1;
  }
}

function renderView(overrides: Partial<AzuosRoleListViewProps> = {}) {
  const actions = {
    onCreate: vi.fn(),
    onAskDelete: vi.fn(),
    onSearchChange: vi.fn(),
    onContextChange: vi.fn(),
    onClearFilters: vi.fn(),
    onRetry: vi.fn(),
  };

  render(RoleListView, {
    props: {
      data: { roles: mockRoles, total: 2, filter: { search: '', context: '' } },
      state: { isLoading: false, isEmpty: false, isFilteredOut: false, error: null },
      actions,
      ...overrides,
    },
  });

  return actions;
}

describe('AzuosRoleListView', () => {
  // feliz
  it('renders the header and list of roles', () => {
    renderView({
      data: {
        currentUser: {
          name: 'Vinícius Gabriel',
          email: 'vinicius@empresa.com.br',
          role: 'admin',
          roles: { sistema: 'admin', infra: 'user', manutencao: 'manager' },
        },
        roles: mockRoles,
        total: 2,
        filter: { search: '', context: '' },
      },
    });

    expect(screen.getByRole('heading', { name: 'Acessos por módulo' })).toBeInTheDocument();
    expect(screen.getByText('Vinícius Gabriel')).toBeInTheDocument();
    expect(screen.getAllByText('vinicius@empresa.com.br').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Infraestrutura').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sistema').length).toBeGreaterThanOrEqual(1);
  });

  it('triggers onCreate when clicking Liberar módulo', async () => {
    const actions = renderView();

    await userEvent.click(screen.getByRole('button', { name: 'Liberar módulo' }));
    expect(actions.onCreate).toHaveBeenCalledOnce();
  });

  it('takes out only the module whose x was clicked', async () => {
    const actions = renderView();

    const removeSystem = screen.getAllByRole('button', { name: 'Tirar o módulo Sistema' });
    await userEvent.click(removeSystem[0]!);
    expect(actions.onAskDelete).toHaveBeenCalledWith(mockRoles[1]);
  });

  /* Duas liberações da mesma pessoa viram UM cartão com os dois módulos. */
  it('shows each person once, with every module they have', () => {
    renderView();

    const cards = document.querySelector('[data-slot="role-cards-mobile"]') as HTMLElement;
    expect(cards.querySelectorAll('.hover-fill')).toHaveLength(1);
    expect(screen.getAllByText('Módulos').length).toBeGreaterThan(0);
  });

  it('shows read-only banner and hides manage buttons for non-superadmin users', () => {
    renderView({
      data: {
        currentUser: {
          name: 'Operador',
          email: 'op@empresa.com.br',
          role: 'admin',
        },
        roles: mockRoles,
        total: 2,
        filter: { search: '', context: '' },
      },
    });

    expect(screen.getByText(/Modo de visualização da equipe/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Liberar módulo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tirar módulo' })).not.toBeInTheDocument();
  });

  // triste
  it('renders empty state when there are no roles', () => {
    renderView({
      data: { roles: [], total: 0, filter: { search: '', context: '' } },
      state: { isLoading: false, isEmpty: true, isFilteredOut: false, error: null },
    });

    expect(screen.getByText('Nenhum módulo liberado')).toBeInTheDocument();
  });

  it('renders error state when error is provided', () => {
    renderView({
      state: {
        isLoading: false,
        isEmpty: false,
        isFilteredOut: false,
        error: 'Erro de permissão',
      },
    });

    expect(screen.getByText('Erro ao carregar os acessos da equipe')).toBeInTheDocument();
  });

  it('renders both mobile cards and desktop table for responsive design', () => {
    const { container } = render(RoleListView, {
      props: {
        data: {
          roles: mockRoles,
          total: 2,
          filter: { search: '', context: '' },
          users: [
            {
              id: 'usr_1',
              name: 'Vinícius Gabriel',
              email: 'vinicius@empresa.com.br',
              role: 'superadmin',
            },
          ],
        },
        state: { isLoading: false, isEmpty: false, isFilteredOut: false, error: null },
        actions: {
          onCreate: vi.fn(),
          onAskDelete: vi.fn(),
          onSearchChange: vi.fn(),
          onContextChange: vi.fn(),
          onClearFilters: vi.fn(),
          onRetry: vi.fn(),
        },
      },
    });

    const mobileCards = container.querySelector('[data-slot="role-cards-mobile"]');
    const desktopTable = container.querySelector('[data-slot="role-table-desktop"]');

    expect(mobileCards).toBeInTheDocument();
    expect(desktopTable).toBeInTheDocument();
    expect(mobileCards?.classList.contains('xl:hidden')).toBe(true);
    expect(desktopTable?.classList.contains('hidden')).toBe(true);
    expect(desktopTable?.classList.contains('xl:block')).toBe(true);
  });

  // feliz
  /* O nível em cada módulo vem do papel no admin-console; módulo que a pessoa não tem é "Sem acesso". */
  it('tells, module by module, what the person can do there', () => {
    renderView({
      data: {
        currentUser: {
          name: 'Bia',
          email: 'bia@empresa.com.br',
          role: 'manager',
          roles: { infra: 'user' },
        },
        roles: [],
        total: 0,
        filter: { search: '', context: '' },
      },
    });

    expect(screen.getByText('Só consulta')).toBeInTheDocument();
    expect(screen.getAllByText('Sem acesso')).toHaveLength(2);
  });

  // triste
  it('shows only the personal card when the team is not for this person', () => {
    renderView({
      data: {
        currentUser: { name: 'Bia', email: 'bia@empresa.com.br', role: 'manager', roles: {} },
        roles: mockRoles,
        total: 2,
        filter: { search: '', context: '' },
      },
      ui: { showTeam: false },
    });

    expect(screen.queryByRole('heading', { name: 'Acessos por módulo' })).not.toBeInTheDocument();
  });
  // feliz
  /* A foto de quem entrou aparece no cartão "Meu perfil", e não só as iniciais. */
  it('shows the photo of the logged person on the profile card', async () => {
    vi.stubGlobal('Image', InstantLoadImage);
    const image = 'https://admin-console.exemplo.com/api/users/u1/avatar?v=3';

    renderView({
      data: {
        currentUser: {
          name: 'Bia',
          email: 'bia@empresa.com.br',
          image,
          role: 'manager',
          roles: {},
        },
        roles: [],
        total: 0,
        filter: { search: '', context: '' },
      },
      ui: { showTeam: false },
    });

    const photo = await vi.waitUntil(() => document.querySelector('[data-slot="avatar-image"]'));
    expect(photo).toHaveAttribute('src', image);
    vi.unstubAllGlobals();
  });

  // triste
  /* A linha é de quem tem o UUID dela: um e-mail antigo, que hoje é de outra pessoa, não troca o
     nome mostrado. */
  it('does not show someone else on a row whose old e-mail is theirs now', () => {
    renderView({
      data: {
        roles: [mockRoles[0]!],
        users: [{ id: 'usr_other', name: 'Outra Pessoa', email: 'vinicius@empresa.com.br' }],
        total: 1,
        filter: { search: '', context: '' },
      },
    });

    expect(screen.queryByText('Outra Pessoa')).not.toBeInTheDocument();
  });
});

describe('groupRolesByPerson', () => {
  // feliz
  it('joins the modules of the same person, in the fixed module order', () => {
    const reversed = [mockRoles[1]!, mockRoles[0]!];
    const [person, ...others] = groupRolesByPerson(reversed);

    expect(others).toHaveLength(0);
    expect(person?.roles.map((role) => role.context)).toEqual(['infra', 'sistema']);
    expect(person?.userEmail).toBe('vinicius@empresa.com.br');
  });

  // triste
  it('treats the same id in another case as the same person, and keeps different people apart', () => {
    const other = { ...mockRoles[0]!, id: 3, userId: 'usr_2', userEmail: null };
    const upper = { ...mockRoles[1]!, userId: 'USR_1' };

    expect(groupRolesByPerson([mockRoles[0]!, upper, other]).map((p) => p.roles.length)).toEqual([2, 1]);
    expect(groupRolesByPerson([])).toEqual([]);
  });
});
