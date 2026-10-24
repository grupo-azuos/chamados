import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import BarChart3 from '@lucide/svelte/icons/chart-column';
import ListChecks from '@lucide/svelte/icons/list-checks';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import AppShell, { type AzuosAppShellProps } from './azuos-app-shell.svelte';

const items = [
  {
    key: 'tickets',
    label: 'Chamados',
    to: '/tickets',
    icon: ListChecks,
    context: 'infra',
    feature: 'tickets',
  },
  {
    key: 'reports',
    label: 'Relatórios',
    to: '/reports',
    icon: BarChart3,
    context: 'infra',
    feature: 'reports',
  },
] as const;

const content = createRawSnippet(() => ({
  render: () => '<div>Conteúdo da rota</div>',
}));

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

/* A dica abre, mas o bits-ui a deixa `visibility: hidden` até a posição ser calculada — e o
   jsdom não mede nada. `hidden: true` procura a dica que ABRIU, sem depender da geometria. */
const TOOLTIP = { hidden: true } as const;

function renderShell(props: Omit<AzuosAppShellProps, 'children'>): ReturnType<typeof render> {
  return render(AppShell, { props: { ...props, children: content } });
}

describe('AzuosAppShell', () => {
  it('renders with the server-provided sidebar state on the first render', () => {
    renderShell({ initialSidebarOpen: false });

    expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
      'data-state',
      'collapsed',
    );
  });

  // feliz
  it('draws the content and the menu items', () => {
    renderShell({ ui: { items } });

    expect(screen.getByText('Conteúdo da rota')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chamados' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Relatórios' })).toBeInTheDocument();
  });

  it('shows the badge when the counter comes through data', () => {
    renderShell({ ui: { items }, data: { badges: { reports: 4 } } });

    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('shows who is using the system in the footer', () => {
    renderShell({ data: { user: { name: 'Ana Souza', email: 'a@b.c', role: 'Administrador' } } });

    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  // feliz
  /* A foto de quem entrou aparece no rodapé, e não só as iniciais. */
  it('shows the photo of who is using the system', async () => {
    vi.stubGlobal('Image', InstantLoadImage);
    const avatarUrl = 'https://admin-console.exemplo.com/api/users/1/avatar?v=2';

    const { container } = renderShell({
      data: { user: { name: 'Ana Souza', email: 'a@b.c', role: 'Administrador', avatarUrl } },
    });

    const image = await vi.waitUntil(() => container.querySelector('[data-slot="avatar-image"]'));
    expect(image).toHaveAttribute('src', avatarUrl);
    vi.unstubAllGlobals();
  });

  // triste
  it('falls back to the initials when there is no photo', () => {
    renderShell({
      data: { user: { name: 'Ana Souza', email: 'a@b.c', role: 'Administrador', avatarUrl: null } },
    });

    expect(screen.getByText('AS')).toBeInTheDocument();
  });

  // feliz
  /* O formato do paralegal: logo branca oficial no topo da barra e o Zuzu debruçado na
     beirada logo acima de quem entrou. */
  it('draws the official logo on top and Zuzu leaning above the user', () => {
    renderShell({ data: { user: { name: 'Ana Souza', email: 'a@b.c', role: 'Administrador' } } });

    const logos = screen.getAllByRole('img', { name: 'Grupo Azuos' });
    expect(logos.map((logo) => logo.getAttribute('src')).join(' ')).toContain('azuos-logo');

    const zuzu = document.querySelector('[data-slot="sidebar-footer"] img[aria-hidden="true"]');
    expect(zuzu?.getAttribute('src')).toContain('debrucado');
  });

  // feliz
  /* As telas públicas ficam à mão, e abrem em outra aba para não tirar ninguém do painel. */
  it('links to opening a ticket and validating a document, in a new tab', () => {
    renderShell({});

    const support = screen.getByRole('link', { name: 'Abrir chamado' });
    const verify = screen.getByRole('link', { name: 'Validar documento' });

    expect(support).toHaveAttribute('href', '/support');
    expect(verify).toHaveAttribute('href', '/verify');
    expect(support).toHaveAttribute('target', '_blank');
  });

  // triste
  /* Os links públicos não entram no menu da tela: não são telas do módulo. */
  it('keeps the public links out of the module menu', () => {
    renderShell({ ui: { items } });

    expect(screen.getAllByRole('link', { name: 'Abrir chamado' })).toHaveLength(1);
  });

  /* Os módulos ficam no cabeçalho da sidebar e permanecem acessíveis com um clique. */
  it('shows the module switcher in the sidebar and asks to switch on a click', async () => {
    const onAreaContextChange = vi.fn();
    renderShell({
      data: {
        areaOptions: [
          { value: 'infra', label: 'Infraestrutura' },
          { value: 'sistema', label: 'Sistema' },
          { value: 'manutencao', label: 'Manutenção' },
        ],
      },
      state: { areaContext: 'infra' },
      actions: { onAreaContextChange },
    });

    const group = screen.getByRole('group', { name: 'Módulos' });
    expect(within(group).getAllByRole('button')).toHaveLength(3);

    await userEvent.click(within(group).getByRole('button', { name: 'Manutenção' }));

    expect(onAreaContextChange).toHaveBeenCalledWith('manutencao');
  });

  /* Cada contexto tem um desenho na frente do texto: a pessoa acha a área pelo formato. */
  it('draws the icon of each context next to its name', () => {
    renderShell({
      data: {
        areaOptions: [
          { value: 'manutencao', label: 'Manutenção', icon: ListChecks },
          { value: 'infra', label: 'Infraestrutura', icon: BarChart3 },
          { value: 'sistema', label: 'Sistema' },
        ],
      },
      state: { areaContext: 'manutencao' },
    });

    const group = screen.getByRole('group', { name: 'Módulos' });

    expect(
      within(group).getByRole('button', { name: 'Manutenção' }).querySelector('svg'),
    ).not.toBeNull();
    expect(
      within(group).getByRole('button', { name: 'Infraestrutura' }).querySelector('svg'),
    ).not.toBeNull();
    /* Opção sem ícone continua valendo: só o texto. */
    expect(within(group).getByRole('button', { name: 'Sistema' }).querySelector('svg')).toBeNull();
    expect(within(group).getByRole('button', { name: 'Sistema' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  /* Com dois módulos ou mais, a barra tem DUAS colunas: os módulos no trilho de ícones e as
     telas, rotuladas, no painel ao lado — com o nome do módulo escolhido em cima. */
  it('draws the modules in the icon rail and the screens in the labelled panel', () => {
    renderShell({
      ui: { items },
      data: {
        areaOptions: [
          { value: 'sistema', label: 'Sistema' },
          { value: 'infra', label: 'Infraestrutura' },
        ],
      },
      state: { areaContext: 'infra' },
    });

    const group = screen.getByRole('group', { name: 'Módulos' });
    expect(group).toHaveClass('flex-col');
    expect(within(group).getByRole('button', { name: 'Infraestrutura' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const panel = screen.getByRole('navigation', { name: 'Telas do módulo' });
    expect(within(panel).getByRole('link', { name: 'Chamados' })).toBeInTheDocument();
    expect(screen.getByText('Infraestrutura', { selector: '[data-sidebar="group-label"]' })).toBeInTheDocument();
  });

  // feliz
  it('shows the module name on hover while the sidebar is expanded', async () => {
    renderShell({
      data: {
        areaOptions: [
          { value: 'infra', label: 'Infraestrutura', icon: ListChecks },
          { value: 'sistema', label: 'Sistema', icon: BarChart3 },
        ],
      },
    });

    await userEvent.hover(screen.getByRole('button', { name: 'Infraestrutura' }));

    expect(await screen.findByRole('tooltip', TOOLTIP)).toHaveTextContent('Infraestrutura');
  });

  // feliz
  it('shows the module name on keyboard focus and dismisses it with Escape', async () => {
    renderShell({
      data: {
        areaOptions: [
          { value: 'sistema', label: 'Sistema', icon: BarChart3 },
          { value: 'infra', label: 'Infraestrutura', icon: ListChecks },
        ],
      },
    });

    await userEvent.tab();

    expect(screen.getByRole('button', { name: 'Sistema' })).toHaveFocus();
    expect(await screen.findByRole('tooltip', TOOLTIP)).toHaveTextContent('Sistema');

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('tooltip', TOOLTIP)).not.toBeInTheDocument();
  });

  /* Recolhida, o painel some e as telas descem para o trilho, separadas dos módulos. */
  it('separates the module icons from the screen icons only when collapsed', () => {
    const { container } = renderShell({
      ui: { items },
      data: {
        areaOptions: [
          { value: 'infra', label: 'Infraestrutura' },
          { value: 'sistema', label: 'Sistema' },
        ],
      },
    });

    const separator = container.querySelector('[data-sidebar="separator"]');
    expect(separator).toHaveClass('h-px');
    expect(separator?.parentElement).toHaveClass('hidden', 'group-data-[collapsible=icon]:flex');
  });

  // triste
  /* Um módulo só não tem o que escolher: a barra fica em uma coluna, sem trilho. */
  it('keeps a single column with only one module', () => {
    renderShell({ data: { areaOptions: [{ value: 'infra', label: 'Infraestrutura' }] } });

    expect(screen.queryByRole('group', { name: 'Módulos' })).not.toBeInTheDocument();
  });

  // triste
  /* Quem atende uma área só (ou nenhuma) não tem o que escolher: o seletor nem aparece. */
  it('draws no context selector when there is nothing to choose', () => {
    renderShell({ data: { areaOptions: [] } });

    expect(screen.queryByRole('group', { name: 'Módulos' })).not.toBeInTheDocument();
  });

  /* Sem módulos para separar, o divisor também não aparece. */
  it('draws no separator when there are no modules', () => {
    const { container } = renderShell({ data: { areaOptions: [] } });

    expect(container.querySelector('[data-sidebar="separator"]')).toBeNull();
  });

  /* Zero não vira selo: um "0" ao lado de cada item seria ruído. */
  it('draws no badge for a zero counter', () => {
    renderShell({ ui: { items }, data: { badges: { reports: 0 } } });

    expect(screen.getByText('Conteúdo da rota')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('does not break without an identity', () => {
    renderShell({});

    expect(screen.getByText('Visitante')).toBeInTheDocument();
  });

  /* Sem callback de encerramento, só oferece o atalho de conta que recebeu. */
  it('links to the account when no sign-out action was supplied', () => {
    renderShell({ data: { accountUrl: 'https://login.exemplo.com.br' } });

    expect(screen.getByRole('link', { name: 'Minha conta' })).toHaveAttribute(
      'href',
      'https://login.exemplo.com.br',
    );
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument();
  });

  it('offers sign out even without an account link', async () => {
    const onSignOut = vi.fn();
    renderShell({ actions: { onSignOut } });
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it('prevents repeated logout and displays a failure when it cannot end the session', () => {
    renderShell({
      actions: { onSignOut: vi.fn() },
      state: { isSigningOut: true, logoutError: 'Não consegui encerrar a sessão.' },
    });
    expect(screen.getByRole('button', { name: 'Saindo…' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui encerrar a sessão.');
  });

  // triste
  it('offers no account link when the address is unknown', () => {
    renderShell({});

    expect(screen.queryByRole('link', { name: 'Minha conta' })).not.toBeInTheDocument();
  });
});

