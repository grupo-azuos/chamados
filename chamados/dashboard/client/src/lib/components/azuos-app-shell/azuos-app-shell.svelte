<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import FileCheck from '@lucide/svelte/icons/file-check';
  import LifeBuoy from '@lucide/svelte/icons/life-buoy';
  import type { Snippet } from 'svelte';
  import type { AreaContext } from '$lib/hooks/use-area-context/use-area-context.svelte';
  import type { NavItem } from '$lib/navigation/navigation';
  import type { ContextRoles } from '@template/shared/schemas/user.schema';

  /**
   * A casca do sistema: menu à esquerda, conteúdo à direita.
   *
   * A composição segue a documentada pelo shadcn: `SidebarMenu` dentro de `SidebarGroup` ›
   * `SidebarGroupContent`; item ativo pelo `isActive` do próprio componente (é o que põe
   * `data-active` no botão); e o `SidebarTrigger` no CONTEÚDO — dentro da barra ele sumiria
   * junto com o que colapsa, e recolhida não haveria como expandir de volta.
   *
   * A `variant` é `inset`: a página herda a cor da barra, e o conteúdo flutua como um cartão
   * arredondado por cima. A cor vem dos tokens `--sidebar-*` em `lib/theme/tokens.css` — não de
   * `class` empilhada no componente baixado.
   *
   * O visual é o do paralegal, a outra casa do Grupo Azuos: barra azul da marca nos dois
   * temas, logo branca oficial no topo (só o símbolo quando recolhida), módulo escolhido em
   * amarelo e o Zuzu debruçado na beirada acima de quem entrou.
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
      /**
       * O seletor de contexto (#13) — os contextos que a pessoa atende. Vazio (o padrão)
       * esconde o controle: é o caso de quem só tem uma área, ou nenhuma.
       */
      areaOptions?: { value: AreaContext; label: string; icon?: LucideIcon }[];
      /**
       * A conta da pessoa no admin-console — trocar senha, foto, sair. Sem endereço, o atalho
       * não aparece: um link para lugar nenhum é pior que nenhum link.
       */
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

  /** As telas públicas que ficam à mão no rodapé da barra, acima do perfil. */
  export const PUBLIC_LINKS: readonly { href: string; label: string; icon: LucideIcon }[] = [
    { href: '/support', label: 'Abrir chamado', icon: LifeBuoy },
    { href: '/verify', label: 'Validar documento', icon: FileCheck },
  ];
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import ThemeToggle from '$lib/components/azuos-theme-toggle/azuos-theme-toggle.svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { cn } from '$lib/utils/cn';
  import SidebarControls from '$lib/components/azuos-sidebar-controls/azuos-sidebar-controls.svelte';
  import CircleUser from '@lucide/svelte/icons/circle-user';
  import LogOut from '@lucide/svelte/icons/log-out';
  import { BrandMark } from '$lib/components/azuos-brand-mark/azuos-brand-mark';
  import { fadeInUp } from '$lib/motion/motion';
  import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarSeparator,
    SidebarTrigger,
  } from '$lib/components/ui/sidebar';
  import * as Tooltip from '$lib/components/azuos-tooltip/azuos-tooltip';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import AppShellNavEntry from '$lib/components/azuos-app-shell-nav-entry/azuos-app-shell-nav-entry.svelte';
  import Zuzu from '$lib/components/azuos-zuzu/azuos-zuzu.svelte';

  /* `state` (o prop) precisa de outro nome aqui dentro: um binding local chamado `state` faz
     o compilador ler `$state(...)` como inscrição numa store `state`, em vez da rune — o
     mesmo problema, e a mesma solução, do `ColumnChart`. */
  let {
    children,
    data,
    ui,
    state: shellState,
    actions,
    initialSidebarOpen = true,
  }: AzuosAppShellProps = $props();

  /* Sem lista padrão: a casca desenha o menu que o módulo dono passou, e nada mais. Um
     padrão que conhecesse as três listas faria o menu de um contexto aparecer no outro
     sempre que alguém esquecesse de passar `ui.items`. */
  const items = $derived(ui?.items ?? []);
  const userName = $derived(data?.user?.name ?? 'Visitante');

  let contentEl: HTMLDivElement | undefined = $state();
  const isMobile = new MediaQuery('(max-width: 767px)');
  let sidebarOpen = $state(untrack(() => initialSidebarOpen));
  const canShowTooltip = $derived(!sidebarOpen && !isMobile.current);

  /* A troca de tela nasce com um fade sutil — sem isso, uma rota substitui a outra num corte
     seco, e o sistema inteiro parece uma sucessão de telas desconectadas em vez de um só
     lugar. `routeKey` é o caminho da rota: só ele muda a cada navegação, então é nele que o
     efeito escuta — reagir ao conteúdo (`children`) reanimaria a cada re-render à toa. */
  $effect(() => {
    void shellState?.routeKey;
    fadeInUp(contentEl ?? null);
  });
</script>

<SidebarProvider bind:open={sidebarOpen}>
  <!-- `collapsible="icon"` e não `offcanvas`: recolhida, a barra vira uma faixa de ícones.
       Sumir por inteiro tiraria da tela a única pista de onde estão as outras telas. -->
  <Sidebar collapsible="icon" variant="inset">
    <SidebarHeader
      class="gap-2 pt-[max(0.5rem,env(safe-area-inset-top))] pl-[max(0.5rem,env(safe-area-inset-left))] group-data-[collapsible=icon]:p-1"
    >
      <!-- A logo é a versão branca, feita para fundo escuro — por isso ela só existe aqui
           dentro, sobre o azul da barra, e nunca sobre o branco do conteúdo. Recolhida, a
           barra não tem largura para o nome: fica só o símbolo oficial. -->
      <div class="flex items-center px-2 py-1.5 group-data-[collapsible=icon]:hidden">
        <BrandMark ui={{ size: 'sm' }} />
      </div>
      <div class="hidden items-center justify-center py-1.5 group-data-[collapsible=icon]:flex">
        <BrandMark ui={{ size: 'sm', variant: 'icon' }} />
      </div>

      {#if data?.areaOptions && data.areaOptions.length > 0}
        <div
          role="group"
          aria-label="Módulos"
          class="flex w-full flex-col items-stretch justify-center gap-1 rounded-control bg-white/10 p-1 ring-1 ring-white/15 md:flex-row md:items-center group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:ring-0"
        >
          {#each data.areaOptions as option (option.value)}
            {@const Icon = option.icon}
            <!-- No desktop, os nomes aparecem no hover e no foco mesmo com a barra aberta.
                 No celular ficam no próprio botão: tocar troca de módulo, sem etapa extra. -->
            <Tooltip.Root disabled={isMobile.current}>
              <Tooltip.Trigger>
                {#snippet child({ props })}
                  <button
                    {...props}
                    type="button"
                    aria-label={option.label}
                    aria-pressed={shellState?.areaContext === option.value}
                    onclick={() => actions?.onAreaContextChange?.(option.value)}
                    class="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex min-h-12 min-w-0 items-center justify-start gap-3 rounded-chip px-3 py-2 transition-colors aria-pressed:bg-brand-yellow-400 aria-pressed:text-brand-blue-900 md:h-10 md:min-h-0 md:flex-1 md:justify-center md:p-0 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:flex-none"
                  >
                    {#if Icon}<Icon
                        class="size-6 shrink-0 group-data-[collapsible=icon]:size-[18px]"
                        aria-hidden="true"
                      />{/if}
                    <span
                      class={cn(
                        'min-w-0 text-left text-sm break-words md:text-center md:text-xs',
                        Icon && 'md:hidden',
                      )}
                    >{option.label}</span>
                  </button>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content
                role="tooltip"
                side={sidebarOpen ? 'bottom' : 'right'}
                sideOffset={8}
                align="center"
              >{option.label}</Tooltip.Content>
            </Tooltip.Root>
          {/each}
        </div>

        <!-- O módulo escolhido é o único em amarelo, com o ícone no azul mais escuro — branco
             sobre o amarelo da marca não passa no contraste. É o mesmo seletor do paralegal. -->

        <!-- Só com a barra recolhida: aberta, a caixa em volta dos módulos já os separa do menu;
             recolhida, a caixa some e os ícones de módulo e de tela viram uma fila só.
             `h-px` vai explícito: a altura do componente baixado depende de um atributo de
             orientação que aqui não chega, e sem ela o fio sai com altura zero. -->
        <SidebarSeparator class="mx-1 mt-1 hidden h-px group-data-[collapsible=icon]:block" />
      {/if}
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <!-- `gap-1`: o item marcado e o item sob o cursor ganham fundo, e sem folga entre
               eles os fundos encostam e viram um bloco só — o menu perde a leitura de quantos
               itens são. O componente baixado vem com `gap-0`, e `lib/components/ui/` não se
               edita (CONTRIBUTING §5): a folga entra por aqui, e o `cn` resolve a disputa em
               favor desta. -->
          <SidebarMenu class="gap-1">
            {#each items as item (item.key)}
              <AppShellNavEntry
                {item}
                badge={data?.badges?.[item.key]}
                isActive={shellState?.activeKey === item.key}
              />
            {/each}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter
      class="pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))]"
    >
      <!-- As duas telas PÚBLICAS, à mão de quem atende: abrir um chamado por alguém e conferir
           um documento emitido. Abrem em outra aba porque ficam fora do painel — sem casca e
           sem menu —, e quem atende não perde a tela em que estava. -->
      <SidebarMenu class="gap-1">
        {#each PUBLIC_LINKS as link (link.href)}
          <SidebarMenuItem>
            <SidebarMenuButton tooltipContent={canShowTooltip ? link.label : undefined}>
              {#snippet child({ props })}
                <a href={link.href} target="_blank" rel="noopener" {...props}>
                  <link.icon aria-hidden="true" />
                  <span>{link.label}</span>
                </a>
              {/snippet}
            </SidebarMenuButton>
          </SidebarMenuItem>
        {/each}
      </SidebarMenu>

      <!-- A BEIRADA em que o Zuzu se debruça, logo acima de quem entrou — como no paralegal.
           A pose é `leaning`: ele se apoia em algo, e sem uma linha embaixo ficaria flutuando
           no meio da barra. A imagem desce 6px sobre a borda de propósito: as asas cruzam a
           linha e ele parece segurar nela. Parado, porque o rodapé não é lugar de chamar
           atenção o dia inteiro. Recolhida, a barra não tem largura para ele — e mascote
           cortado ao meio não é carinho. -->
      <div
        class="border-sidebar-border pointer-events-none flex justify-center border-b group-data-[collapsible=icon]:hidden"
      >
        <Zuzu data={{ pose: 'leaning' }} ui={{ size: 86, className: '-mb-1.5' }} />
      </div>

      <!-- A mesma folga do menu de cima: aqui são o cartão de quem entrou e a conta dela. -->
      <SidebarMenu class="gap-1">
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            tooltipContent={canShowTooltip ? userName : undefined}
            onclick={actions?.onOpenProfile}
            aria-label="Abrir perfil do usuário"
          >
            <PersonAvatar name={userName} avatarUrl={data?.user?.avatarUrl} ui={{ size: 'md' }} />
            <span class="grid flex-1 text-left leading-tight">
              <span class="truncate text-sm font-semibold">{userName}</span>
              <span class="truncate text-xs tracking-wider uppercase opacity-70">
                {data?.user?.role ?? '—'}
              </span>
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {#if data?.accountUrl}
          <SidebarMenuItem>
            <!-- A conta continua no admin-console; o botão abaixo encaminha o logout a ele. -->
            <SidebarMenuButton tooltipContent={canShowTooltip ? 'Minha conta' : undefined}>
              {#snippet child({ props })}
                <a href={data.accountUrl} {...props}>
                  <CircleUser aria-hidden="true" />
                  <span>Minha conta</span>
                </a>
              {/snippet}
            </SidebarMenuButton>
          </SidebarMenuItem>
        {/if}
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
      {#if shellState?.logoutError}
        <p role="alert" class="px-2 text-xs text-sidebar-foreground group-data-[collapsible=icon]:sr-only">
          {shellState.logoutError}
        </p>
      {/if}
    </SidebarFooter>

    <!-- A borda arrastável: recolher também pela lateral, sem procurar o botão. -->
    <SidebarControls />
  </Sidebar>

  <!-- `min-w-0`: sem isto a área de conteúdo não encolhe abaixo da largura natural da tabela,
       e quem rola para o lado é a PÁGINA inteira, em vez da tabela dentro da caixa dela. -->
  <SidebarInset class="border-sidebar-border bg-background border min-w-0">
    <header
      class="flex min-h-[calc(3rem+env(safe-area-inset-top))] shrink-0 items-center gap-3 pt-[env(safe-area-inset-top)] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]"
    >
      <SidebarTrigger />
      <div role="group" aria-label="Aparência" class="ml-auto flex items-center gap-2">
        <span class="text-muted-foreground text-xs">Tema</span>
        <ThemeToggle ui={{ variant: 'surface' }} />
      </div>
    </header>

    <!-- A MARGEM DO CONTEÚDO É DA CASCA, e não de cada tela: quando cada tela definia a sua,
         uma esquecia o respiro de cima, outra usava uma medida diferente, e trocar de tela (ou
         de contexto) fazia o conteúdo "pular" de lugar. A tela decide só a largura máxima. -->
    <div
      bind:this={contentEl}
      class="app-content min-w-0 w-full flex-1 pt-3 pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(2.5rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] sm:pt-4 sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))]"
    >
      {@render children()}
    </div>
  </SidebarInset>
</SidebarProvider>
