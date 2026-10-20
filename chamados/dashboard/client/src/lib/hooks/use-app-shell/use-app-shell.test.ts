import { type SessionUser } from '@template/shared/schemas/user.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type AreaContext } from '$lib/hooks/use-area-context/use-area-context.svelte';
import {
  INFRA_NAV_ITEMS,
  MAINTENANCE_NAV_ITEMS,
  SYSTEM_NAV_ITEMS,
  type NavItem,
} from '$lib/navigation/navigation';
import Harness from './use-app-shell-harness.test.svelte';
import { type AppShellModel } from './use-app-shell.svelte';

/* O endereço da conta vem da API; aqui ele é fixo, para o teste não depender de rede. */
vi.mock('$lib/api/auth.api', () => ({
  authApi: {
    config: vi.fn().mockResolvedValue({ accountUrl: 'https://login.exemplo.com.br' }),
    logout: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('$lib/utils/leave-session.util', () => ({ leaveSession: vi.fn() }));
const { leaveSession } = await import('$lib/utils/leave-session.util');
const { authApi } = await import('$lib/api/auth.api');
const { goto } = await import('$app/navigation');
const { page } = await import('$app/state');

/** A tela aberta, do ponto de vista do model: é dela que sai o item aceso. */
function openScreen(pathname: string) {
  page.url = new URL(`http://localhost:5173${pathname}`);
}

function user(overrides: Partial<SessionUser> = {}): SessionUser {
  return { id: '1', email: 'ana@empresa.com.br', name: 'Ana', role: 'admin', ...overrides };
}

/**
 * Monta a casca como o layout de um módulo monta: com o contexto e o menu DELE.
 * O padrão é a Infraestrutura, por ser o módulo com o sistema inteiro.
 */
function mountModel(
  overrides: Partial<SessionUser> = {},
  shell: { context: AreaContext; items: readonly NavItem[] } = {
    context: 'infra',
    items: INFRA_NAV_ITEMS,
  },
): AppShellModel {
  let model!: AppShellModel;
  render(Harness, {
    props: {
      user: user(overrides),
      context: shell.context,
      items: shell.items,
      onReady: (ready) => (model = ready),
    },
  });

  return model;
}

beforeEach(() => {
  vi.mocked(goto).mockClear();
  vi.mocked(leaveSession).mockClear();
  vi.mocked(authApi.logout).mockReset().mockResolvedValue(undefined);
  openScreen('/');
});

describe('useAppShellModel contexts', () => {
  it('ends the session before leaving the dashboard', async () => {
    const model = mountModel();
    model.actions.onSignOut();
    await waitFor(() => expect(authApi.logout).toHaveBeenCalledOnce());
    await waitFor(() => expect(leaveSession).toHaveBeenCalledOnce());
  });

  it('stays on the dashboard and exposes an error if logout fails', async () => {
    vi.mocked(authApi.logout).mockRejectedValueOnce(new Error('Sessão indisponível.'));
    const model = mountModel();
    model.actions.onSignOut();
    await waitFor(() => expect(model.state.logoutError).toBe('Sessão indisponível.'));
    expect(leaveSession).not.toHaveBeenCalled();
  });
  // feliz
  /* O menu é o do MÓDULO QUE MONTOU a casca, e nada mais: quem decide é a pasta do layout,
     não um filtro em tempo de execução. Infraestrutura cuida do parque de máquinas; Sistema
     é só chamado. */
  it('gives only the menu of the module that mounted it', () => {
    openScreen('/infra/computers');
    const infra = mountModel();
    expect(infra.ui.items.map((item) => item.key)).toContain('infra/computers');
    expect(infra.state.areaContext).toBe('infra');

    openScreen('/system/tickets');
    const system = mountModel({}, { context: 'sistema', items: SYSTEM_NAV_ITEMS });
    expect(system.ui.items.map((item) => item.key)).toEqual(
      SYSTEM_NAV_ITEMS.map((item) => item.key),
    );
    expect(system.state.areaContext).toBe('sistema');
    expect(system.state.activeKey).toBe('system/tickets');
  });

  /* A TRAVA: a casca de um módulo não acende item nenhum em endereço de outro — e o menu
     continua sendo só o dela. É o que impede o menu da Manutenção de aparecer em `/infra`. */
  it('lights nothing when the address belongs to another module', () => {
    openScreen('/infra/parts');
    const model = mountModel({}, { context: 'manutencao', items: MAINTENANCE_NAV_ITEMS });

    expect(model.state.activeKey).toBeUndefined();
    expect(model.ui.items.every((item) => item.context === 'manutencao')).toBe(true);
  });

  /* Chamados existe nos três contextos: trocar de contexto ali leva para os Chamados do
     contexto escolhido — outra rota, com a fila dele. */
  it('takes the person to the same screen of the chosen context', async () => {
    openScreen('/infra/tickets');
    const model = mountModel();

    model.actions.onAreaContextChange('manutencao');

    await waitFor(() => expect(goto).toHaveBeenCalledWith('/maintenance/tickets'));
  });

  // triste
  /* Trocar de contexto na Rede (que é só de Infraestrutura) não pode deixar a pessoa numa
     tela fora do menu: o sistema leva para a primeira tela do contexto novo — o Painel dele. */
  it('takes the person to the first screen when the open one does not exist there', async () => {
    openScreen('/infra/network');
    const model = mountModel();

    model.actions.onAreaContextChange('manutencao');

    await waitFor(() => expect(goto).toHaveBeenCalledWith('/maintenance/dashboard'));
  });

  /* O perfil não é de módulo nenhum, e não existe "trocar só o menu": a casca de cada módulo
     é a pasta dele. Escolher um contexto ali é entrar nele, pela primeira tela (o Painel do módulo). */
  it('takes the person into the chosen context from a screen without a module', async () => {
    openScreen('/profile');
    const model = mountModel();

    model.actions.onAreaContextChange('sistema');

    await waitFor(() => expect(goto).toHaveBeenCalledWith('/system/dashboard'));
  });

  /* Sem cargo em área nenhuma, o seletor não aparece — não há o que escolher. */
  it('offers no context to choose while the areas of the person are unknown', () => {
    const model = mountModel();

    expect(model.data.areaOptions).toEqual([]);
  });
});

describe('useAppShellModel', () => {
  // feliz
  it('translates the session user into what the shell shows', () => {
    const model = mountModel({
      name: 'Ana Souza',
      email: 'ana@empresa.com.br',
      role: 'manager',
      roles: { sistema: 'admin', infra: 'user', manutencao: 'manager' },
    });

    expect(model.data.user).toEqual({
      name: 'Ana Souza',
      email: 'ana@empresa.com.br',
      role: 'Gestor',
      roles: { sistema: 'admin', infra: 'user', manutencao: 'manager' },
      avatarUrl: null,
    });
  });

  // feliz
  /* A foto vem do admin-console pelo `/api/auth/me`: sem repassá-la, o rodapé fica nas iniciais. */
  it('passes the admin-console photo on to the shell', () => {
    const model = mountModel({ image: 'https://admin-console.exemplo.com/api/users/1/avatar?v=2' });

    expect(model.data.user.avatarUrl).toBe(
      'https://admin-console.exemplo.com/api/users/1/avatar?v=2',
    );
  });

  it('navigates to /profile on onOpenProfile', async () => {
    const model = mountModel();

    model.actions.onOpenProfile();
    await waitFor(() => expect(goto).toHaveBeenCalledWith('/profile'));
  });

  /* A conta e o encerramento da sessão continuam sendo do admin-console. */
  it('gives the address of the account at the admin-console', async () => {
    const model = mountModel();

    await waitFor(() => expect(model.data.accountUrl).toBe('https://login.exemplo.com.br'));
  });

  // triste
  it('gives no account address while the server has not answered or has none', async () => {
    vi.mocked(authApi.config).mockResolvedValueOnce({ accountUrl: null });
    const model = mountModel();

    await waitFor(() => expect(authApi.config).toHaveBeenCalled());
    expect(model.data.accountUrl).toBeNull();
  });
});
