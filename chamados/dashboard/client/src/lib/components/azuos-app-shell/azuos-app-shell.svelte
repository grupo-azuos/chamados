<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import CircleUser from '@lucide/svelte/icons/circle-user';
  import FileCheck from '@lucide/svelte/icons/file-check';
  import LifeBuoy from '@lucide/svelte/icons/life-buoy';
  import type { Snippet } from 'svelte';
  import type { AreaContext } from '$lib/hooks/use-area-context/use-area-context.svelte';
  import type { NavItem } from '$lib/navigation/navigation';
  import type { ContextRoles } from '@template/shared/schemas/user.schema';

  /**
   * A CASCA PADRÃO DO GRUPO AZUOS — a mesma dos outros 12 sistemas, em Svelte.
   *
   * Skill `app-shell-standard`. Este arquivo é TRAVADO pelo hook `protect-app-shell.mjs`: só
   * quem administra (`git config azuos.admin true`) muda. Ele é o par, tela por tela, do
   * `azuos-app-shell.component.tsx` dos sistemas em React:
   *
   * COMPUTADOR — barra azul à esquerda (`variant="inset"`, `collapsible="icon"`):
   *  - menos de dois módulos → UMA coluna: logo, itens com ícone + rótulo, e no rodapé os
   *    atalhos, o Zuzu debruçado, o perfil e o Sair. Recolhida, tudo vira ícone com dica.
   *  - dois módulos ou mais → DUAS colunas: o trilho de ícones (logo, módulos, e no rodapé
   *    atalhos, foto e Sair) e o painel com os itens do módulo, rotulados, com o Zuzu no pé.
   *    Recolhida, sobra só o trilho — com os itens do módulo em ícone.
   *
   * CELULAR — sem barra lateral: uma barra fixa embaixo com 3 itens + ☰, e o ☰ abre o menu
   * inteiro numa gaveta de baixo.
   *
   * Os itens vêm da lista do módulo dono, em `lib/navigation/navigation.ts`, e entram por
   * `ui.items`. Tela nova no menu é uma linha lá, não aqui.
   */
  export type AzuosAppShellProps = {
    children: Snippet;
    data?: {
      /** Contador ao lado do item, pela `key` dele. Zero não desenha selo. */
      badges?: Partial<Record<string, number>>;
      user?: {
        name: string;
        email: string;
        role: string;
        roles?: ContextRoles;
        /** A foto do admin-console (endereço completo). Sem ela, as iniciais. */
        avatarUrl?: string | null;
      };
      /** Os módulos que a pessoa atende. Dois ou mais desenham o formato de duas colunas. */
      areaOptions?: { value: AreaContext; label: string; icon?: LucideIcon }[];
      /** A conta no admin-console. Sem endereço, o atalho não aparece. */
      accountUrl?: string | null;
    };
    ui?: { items?: readonly NavItem[] };
    state?: {
      isCollapsed?: boolean;
      activeKey?: string;
      /** O caminho da rota atual — trocar de valor é o gatilho da animação entre telas. */
      routeKey?: string;
      isProfileOpen?: boolean;
      areaContext?: AreaContext;
      isSigningOut?: boolean;
      logoutError?: string | null;
    };
    actions?: {
      onOpenProfile?: () => void;
      onCloseProfile?: () => void;
      onViewRoles?: () => void;
      onAreaContextChange?: (context: AreaContext) => void;
      onSignOut?: () => void;
    };
    initialSidebarOpen?: boolean;
  };

  /** Atalho do rodapé, acima do perfil. */
  type ShellAction = { href: string; label: string; icon: LucideIcon; opensInNewTab: boolean };

  /** As telas públicas que ficam à mão no rodapé da barra, acima do perfil. */
  export const PUBLIC_LINKS: readonly ShellAction[] = [
    { href: '/support', label: 'Abrir chamado', icon: LifeBuoy, opensInNewTab: true },
    { href: '/verify', label: 'Validar documento', icon: FileCheck, opensInNewTab: true },
  ];

  /** No celular, a barra de baixo mostra estes itens; o resto mora no menu (☰). */
  export const MOBILE_BAR_ITEMS = 3;

  /* Duas colunas: o trilho tem a largura da barra recolhida, e o painel, a de sempre. */
  /* Trilho (ícone + a folga do `inset`, que ele ocupa por inteiro) + painel de 16rem. */
  const TWO_COLUMN_WIDTH = '--sidebar-width: calc(var(--sidebar-width-icon) + 1rem + 2px + 16rem);';

  const RAIL_BUTTON =
    'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground rounded-box flex size-9 shrink-0 items-center justify-center outline-hidden transition-colors focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5';

  /* O módulo escolhido é o único em amarelo, com o ícone no azul mais escuro — branco sobre o
     amarelo da marca não passa no contraste. */
  /* O amarelo é o destaque que DESLIZA (`slidingIndicator` no grupo de módulos); o botão só troca
     a cor do ícone e não pinta fundo no hover, para não brigar com o destaque. */
  const AREA_SELECTED =
    'aria-pressed:text-brand-blue-900 aria-pressed:hover:bg-transparent aria-pressed:hover:text-brand-blue-900';

  const RAIL_INDICATOR = {
    selector: '[aria-pressed="true"]',
    indicatorClass: 'rounded-box bg-brand-yellow-400',
    attributes: ['aria-pressed'],
  };

  const PAGE_INDICATOR = {
    selector: '[aria-current="page"]',
    indicatorClass: 'rounded-box bg-sidebar-accent',
    attributes: ['aria-current'],
  };

  const BAR_ITEM =
    'text-muted-foreground hover:text-foreground data-[active=true]:bg-sidebar data-[active=true]:text-sidebar-foreground rounded-box flex min-h-14 w-full min-w-0 flex-col items-center justify-center gap-1 px-1 py-1.5 transition-colors data-[active=true]:shadow-xs [&_svg]:size-5';

  const SHEET_ROW =
    'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground rounded-control flex min-h-12 w-full items-center gap-3 px-3 text-[1rem] transition-colors disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0';
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import LogOut from '@lucide/svelte/icons/log-out';
  import Menu from '@lucide/svelte/icons/menu';
  import { cn } from '$lib/utils/cn';
  import SidebarControls from '$lib/components/azuos-sidebar-controls/azuos-sidebar-controls.svelte';
  import { BrandMark } from '$lib/components/azuos-brand-mark/azuos-brand-mark';
  import { fadeInUp } from '$lib/motion/motion';
  import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarSeparator,
    SidebarTrigger,
  } from '$lib/components/ui/sidebar';
  import * as Sheet from '$lib/components/ui/sheet';
  import * as Tooltip from '$lib/components/azuos-tooltip/azuos-tooltip';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import AppShellNavEntry from '$lib/components/azuos-app-shell-nav-entry/azuos-app-shell-nav-entry.svelte';
  import { slidingIndicator } from '$lib/motion/sliding-indicator';
  import Zuzu from '$lib/components/azuos-zuzu/azuos-zuzu.svelte';

  /* `state` (o prop) precisa de outro nome aqui dentro: um binding local chamado `state` faz
     o compilador ler `$state(...)` como inscrição numa store `state`, em vez da rune. */
  let {
    children,
    data,
    ui,
    state: shellState,
    actions,
    initialSidebarOpen = true,
  }: AzuosAppShellProps = $props();

  /* Sem lista padrão: a casca desenha o menu que o módulo dono passou, e nada mais. */
  const items = $derived(ui?.items ?? []);
  const userName = $derived(data?.user?.name ?? 'Visitante');
  const userRole = $derived(data?.user?.role ?? '—');
  const areas = $derived(data?.areaOptions ?? []);
  const isTwoColumn = $derived(areas.length >= 2);
  const activeArea = $derived(areas.find((area) => area.value === shellState?.areaContext));
  const shellActions = $derived<ShellAction[]>([
    ...PUBLIC_LINKS,
    ...(data?.accountUrl
      ? [{ href: data.accountUrl, label: 'Minha conta', icon: CircleUser, opensInNewTab: false }]
      : []),
  ]);
  const barItems = $derived(items.slice(0, MOBILE_BAR_ITEMS));
  const isMenuActive = $derived(!barItems.some((item) => item.key === shellState?.activeKey));

  let contentEl: HTMLDivElement | undefined = $state();
  const isMobile = new MediaQuery('(max-width: 767px)');
  let sidebarOpen = $state(untrack(() => initialSidebarOpen));
  let isMenuOpen = $state(false);
  const canShowTooltip = $derived(!sidebarOpen && !isMobile.current);

  /* A troca de tela nasce com um fade sutil. `routeKey` é o caminho da rota: só ele muda a cada
     navegação, então é nele que o efeito escuta. */
  $effect(() => {
    void shellState?.routeKey;
    fadeInUp(contentEl ?? null);
  });
</script>

{#snippet railHint(label: string, trigger: Snippet<[Record<string, unknown>]>)}
  <!-- No trilho a dica aparece SEMPRE, aberto ou recolhido: ali só há ícones. -->
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        {@render trigger(props)}
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content role="tooltip" side="right" sideOffset={8} align="center">{label}</Tooltip.Content>
  </Tooltip.Root>
{/snippet}

<!-- Os botões do rodapé do trilho ficam aqui fora: um snippet declarado direto dentro de um
     componente vira propriedade dele, e não um trecho para renderizar. -->
{#snippet profileButton(props: Record<string, unknown>)}
  <button
    {...props}
    type="button"
    aria-label="Abrir perfil do usuário"
    onclick={actions?.onOpenProfile}
    class={RAIL_BUTTON}
  >
    <PersonAvatar name={userName} avatarUrl={data?.user?.avatarUrl} ui={{ size: 'md' }} />
  </button>
{/snippet}

{#snippet signOutButton(props: Record<string, unknown>)}
  <button
    {...props}
    type="button"
    aria-label={shellState?.isSigningOut ? 'Saindo…' : 'Sair'}
    disabled={shellState?.isSigningOut}
    onclick={actions?.onSignOut}
    class={RAIL_BUTTON}
  >
    <LogOut aria-hidden="true" />
  </button>
{/snippet}

{#snippet zuzuLedge()}
  <!-- A BEIRADA em que o Zuzu se debruça: a pose `leaning` pede uma linha embaixo, e a imagem
       desce sobre a borda para as asas cruzarem a linha. Parado, e só com a barra aberta. -->
  <div
    class="border-sidebar-border pointer-events-none flex justify-center border-b group-data-[collapsible=icon]:hidden"
  >
    <Zuzu data={{ pose: 'leaning' }} ui={{ size: 86, className: '-mb-1.5' }} />
  </div>
{/snippet}

{#snippet logoutError()}
  {#if shellState?.logoutError}
    <p role="alert" class="px-2 text-xs text-sidebar-foreground group-data-[collapsible=icon]:sr-only">
      {shellState.logoutError}
    </p>
  {/if}
{/snippet}

<SidebarProvider bind:open={sidebarOpen} class="h-svh overflow-hidden" style={isTwoColumn ? TWO_COLUMN_WIDTH : ''}>
  {#if !isMobile.current && isTwoColumn}
    <!-- O padrão de barras aninhadas do shadcn: a de fora recolhe para a largura de ícone, e
         com isso o painel some e sobra o trilho. -->
    <!-- `p-0!`: o trilho vai até a borda da tela, de cima a baixo; a folga do `inset` (8px só de um
         lado) deixava os ícones fora do centro. O trilho é mais escuro que o painel: primeiro
         nível (o módulo) e segundo (a tela), separados pela cor, sem linha divisória. -->
    <Sidebar collapsible="icon" variant="inset" class="overflow-hidden p-0! *:data-[sidebar=sidebar]:flex-row">
      <Sidebar collapsible="none" class="w-[calc(var(--sidebar-width-icon)+1rem+2px)]! bg-brand-blue-900!">
        <SidebarHeader class="items-center px-0 pt-3">
          <!-- A logo como ícone de app: um ladrilho de canto arredondado no azul do painel. -->
          <div class="bg-sidebar rounded-box flex size-10 items-center justify-center">
            <BrandMark ui={{ size: 'sm', variant: 'icon' }} />
          </div>
        </SidebarHeader>

        <SidebarContent class="items-center gap-1 px-0 py-2">
          <div role="group" aria-label="Módulos" use:slidingIndicator={RAIL_INDICATOR} class="flex flex-col items-center gap-1">
            {#each areas as option (option.value)}
              {@const Icon = option.icon}
              {#snippet areaButton(props: Record<string, unknown>)}
                <button
                  {...props}
                  type="button"
                  aria-label={option.label}
                  aria-pressed={shellState?.areaContext === option.value}
                  onclick={() => actions?.onAreaContextChange?.(option.value)}
                  class={cn(RAIL_BUTTON, AREA_SELECTED)}
                >
                  {#if Icon}<Icon aria-hidden="true" />{:else}<span class="text-xs font-bold">{option.label.slice(0, 2)}</span>{/if}
                </button>
              {/snippet}
              {@render railHint(option.label, areaButton)}
            {/each}
          </div>

          <!-- Recolhida, o painel some: os itens do módulo descem para o trilho. -->
          <div class="hidden flex-col items-center gap-1 group-data-[collapsible=icon]:flex">
            <SidebarSeparator class="my-1 h-px w-6" />
            <nav aria-label="Menu principal" class="flex flex-col items-center gap-1">
              {#each items as item (item.key)}
                {@const ItemIcon = item.icon}
                {#snippet itemLink(props: Record<string, unknown>)}
                  <a
                    {...props}
                    href={item.to}
                    aria-label={item.label}
                    aria-current={shellState?.activeKey === item.key ? 'page' : undefined}
                    data-active={shellState?.activeKey === item.key}
                    class={RAIL_BUTTON}
                  >
                    <ItemIcon aria-hidden="true" />
                  </a>
                {/snippet}
                {@render railHint(item.label, itemLink)}
              {/each}
            </nav>
          </div>
        </SidebarContent>

        <SidebarFooter class="items-center gap-1 px-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {#each shellActions as link (link.href)}
            {@const LinkIcon = link.icon}
            {#snippet actionLink(props: Record<string, unknown>)}
              <a
                {...props}
                href={link.href}
                target={link.opensInNewTab ? '_blank' : undefined}
                rel={link.opensInNewTab ? 'noopener noreferrer' : undefined}
                aria-label={link.label}
                class={RAIL_BUTTON}
              >
                <LinkIcon aria-hidden="true" />
              </a>
            {/snippet}
            {@render railHint(link.label, actionLink)}
          {/each}

          {@render railHint(userName, profileButton)}

          {#if actions?.onSignOut}
            {@render railHint(shellState?.isSigningOut ? 'Saindo…' : 'Sair', signOutButton)}
          {/if}
        </SidebarFooter>
      </Sidebar>

      <!-- Sem logo no painel: a marca já está no trilho (o "S" no ladrilho), e o painel começa
           direto no nome do módulo. -->
      <Sidebar collapsible="none" class="hidden min-w-0 flex-1 pt-3 pb-2 md:flex">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel class="text-sidebar-foreground/70 text-xs font-semibold tracking-wider uppercase">
              {activeArea?.label ?? ''}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <nav aria-label="Telas do módulo" use:slidingIndicator={PAGE_INDICATOR}>
                <SidebarMenu class="gap-1">
                  {#each items as item (item.key)}
                    <AppShellNavEntry
                      {item}
                      badge={data?.badges?.[item.key]}
                      isActive={shellState?.activeKey === item.key}
                    />
                  {/each}
                </SidebarMenu>
              </nav>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter class="pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {@render zuzuLedge()}
          <div class="grid px-2 pb-1 leading-tight">
            <span class="truncate text-sm font-semibold">{userName}</span>
            <span class="truncate text-xs tracking-wider uppercase opacity-70">{userRole}</span>
          </div>
          {@render logoutError()}
        </SidebarFooter>
      </Sidebar>

      <!-- A borda arrastável: recolher também pela lateral, sem procurar o botão. -->
      <SidebarControls />
    </Sidebar>
  {:else if !isMobile.current}
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader
        class="pt-[max(0.5rem,env(safe-area-inset-top))] pl-[max(0.5rem,env(safe-area-inset-left))] group-data-[collapsible=icon]:p-1"
      >
        <!-- A logo branca é feita para o azul da barra; recolhida, fica só o símbolo. -->
        <div class="flex items-center px-2 py-1.5 group-data-[collapsible=icon]:hidden">
          <BrandMark ui={{ size: 'sm' }} />
        </div>
        <div class="hidden items-center justify-center py-1.5 group-data-[collapsible=icon]:flex">
          <BrandMark ui={{ size: 'sm', variant: 'icon' }} />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <nav aria-label="Menu principal" use:slidingIndicator={PAGE_INDICATOR}>
              <SidebarMenu class="gap-1">
                {#each items as item (item.key)}
                  <AppShellNavEntry
                    {item}
                    badge={data?.badges?.[item.key]}
                    isActive={shellState?.activeKey === item.key}
                  />
                {/each}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>

        <!-- Os ATALHOS no fim da lista, presos acima do Zuzu: o mesmo tamanho dos itens do menu, com
             um título separando o que é tela do que é atalho. Abre em outra aba? A setinha avisa. -->
        {#if shellActions.length > 0}
          <SidebarGroup class="mt-auto">
            <SidebarGroupLabel class="text-sidebar-foreground/70 text-xs font-semibold tracking-wider uppercase">
              Atalhos
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu aria-label="Atalhos" class="gap-1">
                {#each shellActions as link (link.href)}
                  {@const LinkIcon = link.icon}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      size="lg"
                      tooltipContent={canShowTooltip ? link.label : undefined}
                      class="text-[1rem] [&_svg]:size-5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
                    >
                      {#snippet child({ props })}
                        <a
                          href={link.href}
                          target={link.opensInNewTab ? '_blank' : undefined}
                          rel={link.opensInNewTab ? 'noopener noreferrer' : undefined}
                          {...props}
                        >
                          <LinkIcon aria-hidden="true" />
                          <span class="flex min-w-0 flex-1 items-center gap-1.5 group-data-[collapsible=icon]:hidden">
                            <span class="truncate">{link.label}</span>
                            {#if link.opensInNewTab}
                              <ArrowUpRight aria-hidden="true" class="text-sidebar-foreground/60 size-3.5! shrink-0" />
                            {/if}
                          </span>
                        </a>
                      {/snippet}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                {/each}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        {/if}
      </SidebarContent>

      <SidebarFooter
        class="pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))]"
      >
        <!-- O Zuzu debruçado na beirada, e embaixo dela quem está usando e o Sair. -->
        {@render zuzuLedge()}

        <SidebarMenu class="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltipContent={canShowTooltip ? userName : undefined}
              onclick={actions?.onOpenProfile}
              aria-label="Abrir perfil do usuário"
              class="group-data-[collapsible=icon]:justify-center"
            >
              <PersonAvatar name={userName} avatarUrl={data?.user?.avatarUrl} ui={{ size: 'md' }} />
              <span class="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span class="truncate text-sm font-semibold">{userName}</span>
                <span class="truncate text-xs tracking-wider uppercase opacity-70">{userRole}</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {#if actions?.onSignOut}
            <SidebarMenuItem>
              <!-- Pelo `child` o botão de verdade recebe `disabled`: o tipo do SidebarMenuButton não aceita. -->
              <SidebarMenuButton tooltipContent={canShowTooltip ? 'Sair' : undefined}>
                {#snippet child({ props })}
                  <button
                    {...props}
                    type="button"
                    disabled={shellState?.isSigningOut}
                    onclick={actions.onSignOut}
                    aria-label={shellState?.isSigningOut ? 'Saindo…' : 'Sair'}
                  >
                    <LogOut aria-hidden="true" />
                    <span class="group-data-[collapsible=icon]:hidden">
                      {shellState?.isSigningOut ? 'Saindo…' : 'Sair'}
                    </span>
                  </button>
                {/snippet}
              </SidebarMenuButton>
            </SidebarMenuItem>
          {/if}
        </SidebarMenu>
        {@render logoutError()}
      </SidebarFooter>

      <!-- A borda arrastável: recolher também pela lateral, sem procurar o botão. -->
      <SidebarControls />
    </Sidebar>
  {/if}

  <!-- `min-w-0`: sem isto a área de conteúdo não encolhe abaixo da largura natural da tabela. -->
  <SidebarInset class="border-sidebar-border bg-background min-w-0 overflow-hidden md:border">
    <!-- O gatilho vive no conteúdo: dentro da barra ele sumiria junto com o que colapsa. No
         celular não há barra lateral — o menu é a barra de baixo. -->
    <header
      class="hidden min-h-[calc(3rem+env(safe-area-inset-top))] shrink-0 items-center gap-3 pt-[env(safe-area-inset-top)] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] md:flex"
    >
      <SidebarTrigger />
    </header>

    <!-- A MARGEM DO CONTEÚDO É DA CASCA, e não de cada tela. A caixa é quem rola; no celular,
         o fim do conteúdo desconta a barra de baixo. -->
    <div
      bind:this={contentEl}
      class="app-content min-h-0 min-w-0 w-full flex-1 overflow-y-auto overscroll-contain pt-3 pr-[max(0.75rem,env(safe-area-inset-right))] pb-[calc(5rem+env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] sm:pt-4 sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] md:pb-[max(2.5rem,env(safe-area-inset-bottom))]"
    >
      {@render children()}
    </div>
  </SidebarInset>

  {#if isMobile.current}
    <nav
      aria-label="Menu principal"
      class="bg-card border-border fixed inset-x-0 bottom-0 z-40 border-t px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-xl md:hidden"
    >
      <ul class="grid grid-cols-4 gap-2">
        {#each barItems as item (item.key)}
          {@const BarIcon = item.icon}
          {@const badge = data?.badges?.[item.key]}
          <li class="min-w-0">
            <a
              href={item.to}
              aria-current={shellState?.activeKey === item.key ? 'page' : undefined}
              data-active={shellState?.activeKey === item.key}
              class={BAR_ITEM}
            >
              <span class="relative">
                <BarIcon aria-hidden="true" />
                {#if badge}
                  <span
                    class="bg-destructive text-destructive-foreground absolute -top-1.5 -right-2.5 min-w-4 rounded-full px-1 text-center text-xs leading-4 font-bold"
                  >{badge}</span>
                {/if}
              </span>
              <span class="max-w-full truncate text-xs font-medium">{item.label}</span>
            </a>
          </li>
        {/each}
        <li class="col-start-4 min-w-0">
          <button
            type="button"
            aria-label="Abrir o menu"
            aria-expanded={isMenuOpen}
            aria-haspopup="dialog"
            data-active={isMenuActive}
            onclick={() => (isMenuOpen = true)}
            class={BAR_ITEM}
          >
            <Menu aria-hidden="true" />
            <span class="max-w-full truncate text-xs font-medium">Menu</span>
          </button>
        </li>
      </ul>
    </nav>

    <Sheet.Root bind:open={isMenuOpen}>
      <Sheet.Content
        side="bottom"
        class="bg-sidebar text-sidebar-foreground border-sidebar-border rounded-t-surface max-h-[85svh] gap-0 overflow-y-auto p-0 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"
      >
        <Sheet.Header class="flex-row items-center px-4 pt-4 pb-2">
          <BrandMark ui={{ size: 'sm' }} />
          <Sheet.Title class="sr-only">Menu</Sheet.Title>
          <Sheet.Description class="sr-only">
            Todas as telas do sistema, o seu perfil e a saída.
          </Sheet.Description>
        </Sheet.Header>

        <div class="flex flex-col gap-3 px-3">
          {#if isTwoColumn}
            <div role="group" aria-label="Módulos" class="rounded-box bg-sidebar-accent/40 flex gap-1 p-1">
              {#each areas as option (option.value)}
                {@const Icon = option.icon}
                <button
                  type="button"
                  aria-pressed={shellState?.areaContext === option.value}
                  onclick={() => actions?.onAreaContextChange?.(option.value)}
                  class="rounded-control text-sidebar-foreground aria-pressed:bg-brand-yellow-400 aria-pressed:text-brand-blue-900 flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5 text-xs font-semibold transition-colors [&_svg]:size-5"
                >
                  {#if Icon}<Icon aria-hidden="true" />{/if}
                  <span class="max-w-full truncate">{option.label}</span>
                </button>
              {/each}
            </div>
          {/if}

          <ul class="flex flex-col gap-1">
            {#each items as item (item.key)}
              {@const RowIcon = item.icon}
              {@const badge = data?.badges?.[item.key]}
              <li>
                <a
                  href={item.to}
                  onclick={() => (isMenuOpen = false)}
                  aria-current={shellState?.activeKey === item.key ? 'page' : undefined}
                  data-active={shellState?.activeKey === item.key}
                  class={SHEET_ROW}
                >
                  <RowIcon aria-hidden="true" />
                  <span class="flex-1 truncate">{item.label}</span>
                  {#if badge}
                    <span class="bg-destructive text-destructive-foreground rounded-full px-2 text-xs font-bold">{badge}</span>
                  {/if}
                </a>
              </li>
            {/each}
          </ul>

          <ul class="border-sidebar-border flex flex-col gap-1 border-t pt-3">
            {#each shellActions as link (link.href)}
              {@const LinkIcon = link.icon}
              <li>
                <a
                  href={link.href}
                  target={link.opensInNewTab ? '_blank' : undefined}
                  rel={link.opensInNewTab ? 'noopener noreferrer' : undefined}
                  onclick={() => (isMenuOpen = false)}
                  class={SHEET_ROW}
                >
                  <LinkIcon aria-hidden="true" />
                  <span class="flex-1 truncate">{link.label}</span>
                </a>
              </li>
            {/each}
          </ul>

          <div class="border-sidebar-border pointer-events-none flex justify-center border-b">
            <Zuzu data={{ pose: 'leaning' }} ui={{ size: 86, className: '-mb-1.5' }} />
          </div>

          <button
            type="button"
            aria-label="Abrir perfil do usuário"
            onclick={() => {
              isMenuOpen = false;
              actions?.onOpenProfile?.();
            }}
            class={SHEET_ROW}
          >
            <PersonAvatar name={userName} avatarUrl={data?.user?.avatarUrl} ui={{ size: 'md' }} />
            <span class="grid flex-1 text-left leading-tight">
              <span class="truncate text-sm font-semibold">{userName}</span>
              <span class="truncate text-xs tracking-wider uppercase opacity-70">{userRole}</span>
            </span>
          </button>

          {#if actions?.onSignOut}
            <button
              type="button"
              disabled={shellState?.isSigningOut}
              onclick={actions.onSignOut}
              class={SHEET_ROW}
            >
              <LogOut aria-hidden="true" />
              <span class="flex-1 text-left">{shellState?.isSigningOut ? 'Saindo…' : 'Sair'}</span>
            </button>
          {/if}

          {#if shellState?.logoutError}
            <p role="alert" class="px-2 text-xs">{shellState.logoutError}</p>
          {/if}
        </div>
      </Sheet.Content>
    </Sheet.Root>
  {/if}
</SidebarProvider>
