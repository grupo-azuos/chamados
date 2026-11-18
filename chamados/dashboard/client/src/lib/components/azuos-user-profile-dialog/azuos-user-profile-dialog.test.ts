import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import UserProfileDialog, { type AzuosUserProfileDialogProps } from './azuos-user-profile-dialog.svelte';

const testUser = {
  name: 'Vinícius Gabriel',
  email: 'vinicius@empresa.com.br',
  role: 'Administrador',
  roles: {
    sistema: 'admin' as const,
    infra: 'user' as const,
    manutencao: 'manager' as const,
  },
};

function renderDialog(overrides: Partial<AzuosUserProfileDialogProps> = {}) {
  const actions = {
    onClose: vi.fn(),
    onViewRoles: vi.fn(),
    onLogout: vi.fn(),
  };

  render(UserProfileDialog, {
    props: {
      data: { user: testUser },
      state: { isOpen: true },
      actions,
      ...overrides,
    },
  });

  return actions;
}

describe('AzuosUserProfileDialog', () => {
  // feliz
  it('renders user details and context roles correctly', () => {
    renderDialog();

    expect(screen.getByText('Vinícius Gabriel')).toBeInTheDocument();
    expect(screen.getByText('vinicius@empresa.com.br')).toBeInTheDocument();
    expect(screen.getByText('Seus Cargos Internos por Área')).toBeInTheDocument();
    expect(screen.getByText('Sistema')).toBeInTheDocument();
    expect(screen.getByText('Infraestrutura')).toBeInTheDocument();
    expect(screen.getByText('Manutenção')).toBeInTheDocument();
  });

  it('triggers onViewRoles when clicking to view team roles', async () => {
    const user = userEvent.setup();
    const actions = renderDialog();

    const viewRolesButton = screen.getByRole('button', { name: 'Ver cargos da equipe' });
    await user.click(viewRolesButton);

    expect(actions.onViewRoles).toHaveBeenCalledOnce();
  });

  it('triggers onLogout when clicking Sair da conta', async () => {
    const user = userEvent.setup();
    const actions = renderDialog();

    const logoutButton = screen.getByRole('button', { name: 'Sair da conta' });
    await user.click(logoutButton);

    expect(actions.onLogout).toHaveBeenCalledOnce();
  });

  // triste
  it('handles missing roles by defaulting to user level', () => {
    renderDialog({
      data: {
        user: {
          name: 'Pessoa Sem Cargos',
          email: 'sem@empresa.com.br',
          role: 'Usuário',
        },
      },
    });

    expect(screen.getByText('Pessoa Sem Cargos')).toBeInTheDocument();
    const userBadges = screen.getAllByText('Usuário');
    expect(userBadges.length).toBeGreaterThanOrEqual(1);
  });
});

describe('AzuosUserProfileDialog — without a person, without the optional actions, and Escape', () => {
  // triste
  it('names an unknown person generically and offers neither roles nor sign out without their actions', () => {
    render(UserProfileDialog, {
      props: { data: { user: undefined }, state: { isOpen: true }, actions: { onClose: vi.fn() } },
    });

    expect(screen.getAllByText('Usuário').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Sair da conta/ })).not.toBeInTheDocument();
  });

  // feliz
  it('closes with Escape', async () => {
    const actions = renderDialog();
    await userEvent.keyboard('{Escape}');
    expect(actions.onClose).toHaveBeenCalled();
  });
});
