import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import BarChart3 from '@lucide/svelte/icons/chart-column';
import ListChecks from '@lucide/svelte/icons/list-checks';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

/* No celular a casca troca a barra lateral pela barra de baixo + gaveta: o `MediaQuery` do Svelte
   lê o `matchMedia`, que aqui diz "tela pequena". */
describe('AzuosAppShell — celular', () => {
  afterEach(() => vi.restoreAllMocks());

  function renderOnPhone() {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('max-width'),
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        }) as MediaQueryList,
    );
    renderShell({ ui: { items } });
  }

  /* `fireEvent` e não `userEvent`: a gaveta do teste anterior deixa `pointer-events: none` no
     body (o bits-ui trava a página enquanto o diálogo está aberto), e o userEvent recusa o clique. */
  async function openSheet() {
    await fireEvent.click(screen.getByRole('button', { name: 'Abrir o menu' }));
    return screen.findByRole('dialog');
  }

  // feliz
  /* Padrão do Android (Compose): a gaveta tem a "linguinha" e não tem o X de fechar. */
  it('draws the sheet with the drag handle and without a close button', async () => {
    renderOnPhone();
    const sheet = await openSheet();

    expect(sheet.querySelector('[data-slot="sheet-drag-handle"]')).toBeInTheDocument();
    expect(within(sheet).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  it('closes the sheet when the handle is dragged down', async () => {
    renderOnPhone();
    const sheet = await openSheet();
    const handle = sheet.querySelector('[data-slot="sheet-drag-handle"]')!;

    await fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientY: 260, pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientY: 260, pointerId: 1 });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  // triste
  it('keeps the sheet open after a short drag', async () => {
    renderOnPhone();
    const sheet = await openSheet();
    const handle = sheet.querySelector('[data-slot="sheet-drag-handle"]')!;

    await fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientY: 116, pointerId: 1 });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('AzuosAppShell — celular: o que a gaveta oferece', () => {
  afterEach(() => vi.restoreAllMocks());

  const areaOptions = [
    { value: 'infra', label: 'Infraestrutura', icon: BarChart3 },
    { value: 'sistema', label: 'Sistema' },
  ] as const;

  function renderOnPhone(props: Omit<AzuosAppShellProps, 'children'> = { ui: { items } }) {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('max-width'),
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        }) as MediaQueryList,
    );
    renderShell(props);
  }

  async function openSheet() {
    await fireEvent.click(screen.getByRole('button', { name: 'Abrir o menu' }));
    return screen.findByRole('dialog');
  }

  // feliz
  it('shows the counters on the bar and lights the open screen', () => {
    renderOnPhone({ ui: { items }, data: { badges: { tickets: 4 } }, state: { activeKey: 'tickets' } });
    const bar = screen.getByRole('navigation', { name: /Menu/ });
    expect(within(bar).getByText('4')).toBeInTheDocument();
    expect(within(bar).getByRole('link', { name: /Chamados/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Abrir o menu' })).toHaveAttribute('data-active', 'false');
  });

  // feliz
  it('switches module, opens a screen and closes the sheet', async () => {
    const onAreaContextChange = vi.fn();
    renderOnPhone({
      ui: { items },
      data: { areaOptions: [...areaOptions], badges: { reports: 2 } },
      state: { areaContext: 'infra' },
      actions: { onAreaContextChange },
    });
    const sheet = await openSheet();
    const modules = within(sheet).getByRole('group', { name: 'Módulos' });
    expect(within(modules).getByRole('button', { name: 'Infraestrutura' })).toHaveAttribute('aria-pressed', 'true');
    await fireEvent.click(within(modules).getByRole('button', { name: 'Sistema' }));
    expect(onAreaContextChange).toHaveBeenCalledWith('sistema');
    expect(within(sheet).getByText('2')).toBeInTheDocument();

    await fireEvent.click(within(sheet).getByRole('link', { name: /Relatórios/ }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  // feliz
  it('opens the profile and the shortcuts from the sheet', async () => {
    const onOpenProfile = vi.fn();
    renderOnPhone({ ui: { items }, data: { accountUrl: 'https://login.exemplo.com.br' }, actions: { onOpenProfile } });
    let sheet = await openSheet();
    await fireEvent.click(within(sheet).getByRole('link', { name: /Minha conta/ }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    sheet = await openSheet();
    await fireEvent.click(within(sheet).getByRole('button', { name: 'Abrir perfil do usuário' }));
    expect(onOpenProfile).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  // triste
  it('shows the sign out failure inside the sheet and blocks a second attempt', async () => {
    const onSignOut = vi.fn();
    renderOnPhone({
      ui: { items },
      actions: { onSignOut },
      state: { isSigningOut: true, logoutError: 'Não consegui encerrar a sessão.' },
    });
    const sheet = await openSheet();
    expect(within(sheet).getByRole('button', { name: /Saindo…/ })).toBeDisabled();
    expect(within(sheet).getByRole('alert')).toHaveTextContent('Não consegui encerrar a sessão.');
  });

  // feliz
  it('signs out from the sheet', async () => {
    const onSignOut = vi.fn();
    renderOnPhone({ ui: { items }, actions: { onSignOut } });
    const sheet = await openSheet();
    await fireEvent.click(within(sheet).getByRole('button', { name: /^Sair$/ }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  // triste
  it('forgets a drag that the browser cancelled and ignores moves without a start', async () => {
    renderOnPhone();
    const sheet = await openSheet();
    const handle = sheet.querySelector('[data-slot="sheet-drag-handle"]')!;

    await fireEvent.pointerMove(handle, { clientY: 300, pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientY: 300, pointerId: 1 });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientY: 140, pointerId: 1 });
    expect(sheet.closest('[data-slot="sheet-content"]') ?? sheet).toHaveStyle({ transition: 'none' });
    await fireEvent.pointerCancel(handle, { pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientY: 400, pointerId: 1 });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('AzuosAppShell — o rodapé do trilho', () => {
  const areaOptions = [
    { value: 'infra', label: 'Infraestrutura', icon: BarChart3 },
    { value: 'sistema', label: 'Sistema' },
  ] as const;

  // feliz
  it('repeats the shortcuts, the profile and the sign out as icons in the rail', async () => {
    const onSignOut = vi.fn();
    const onOpenProfile = vi.fn();
    renderShell({
      ui: { items },
      data: { areaOptions: [...areaOptions], accountUrl: 'https://login.exemplo.com.br', user: { name: 'Ana', role: 'Admin' } },
      state: { areaContext: 'infra', activeKey: 'tickets' },
      actions: { onSignOut, onOpenProfile },
    });

    const account = screen.getByRole('link', { name: 'Minha conta' });
    await userEvent.hover(account);
    expect((await screen.findAllByRole('tooltip', TOOLTIP)).some((tip) => tip.textContent?.includes('Minha conta'))).toBe(true);

    const profileButton = screen.getByRole('button', { name: 'Abrir perfil do usuário' });
    await userEvent.hover(profileButton);
    await waitFor(() =>
      expect(screen.getAllByRole('tooltip', TOOLTIP).some((tip) => tip.textContent?.includes('Ana'))).toBe(true),
    );
    await userEvent.click(profileButton);
    expect(onOpenProfile).toHaveBeenCalled();

    const signOutButton = screen.getByRole('button', { name: 'Sair' });
    await userEvent.hover(signOutButton);
    await waitFor(() =>
      expect(screen.getAllByRole('tooltip', TOOLTIP).some((tip) => tip.textContent?.includes('Sair'))).toBe(true),
    );
    await userEvent.click(signOutButton);
    expect(onSignOut).toHaveBeenCalled();
    const rail = screen.getByRole('navigation', { name: 'Menu principal' });
    expect(within(rail).getByRole('link', { name: 'Chamados' })).toHaveAttribute('aria-current', 'page');
  });

  // triste
  it('disables the rail sign out while leaving', () => {
    renderShell({
      ui: { items },
      data: { areaOptions: [...areaOptions] },
      state: { areaContext: 'infra', isSigningOut: true },
      actions: { onSignOut: vi.fn() },
    });
    expect(screen.getAllByRole('button', { name: 'Saindo…' })[0]).toBeDisabled();
  });

  // feliz
  it('names the module by its initials in the rail when it has no icon', async () => {
    renderShell({
      ui: { items },
      data: { areaOptions: [...areaOptions] },
      state: { areaContext: 'sistema' },
    });
    const rail = screen.getByRole('group', { name: 'Módulos' });
    const system = within(rail).getByRole('button', { name: 'Sistema' });
    expect(system).toHaveTextContent('Si');
    await userEvent.hover(system);
    await waitFor(() =>
      expect(screen.getAllByRole('tooltip', TOOLTIP).some((tip) => tip.textContent?.includes('Sistema'))).toBe(true),
    );
    await userEvent.hover(within(screen.getByRole('navigation', { name: 'Menu principal' })).getByRole('link', { name: 'Chamados' }));
    await waitFor(() =>
      expect(screen.getAllByRole('tooltip', TOOLTIP).some((tip) => tip.textContent?.includes('Chamados'))).toBe(true),
    );
  });
});
