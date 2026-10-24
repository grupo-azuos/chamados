<script lang="ts">
  /**
   * Um item do menu — extraído do `AppShell` só porque a animação de "virou ativo" precisa do
   * próprio ciclo de vida do componente (`$effect` por item). Não é peça pública: nada fora de
   * `app-shell.component.svelte` importa isto.
   */
  import { useSidebar } from '$lib/components/ui/sidebar/context.svelte';
  import { popIn } from '$lib/motion/motion';
  import { SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem } from '$lib/components/ui/sidebar';
  import type { NavItem } from '$lib/navigation/navigation';

  let { item, badge, isActive }: { item: NavItem; badge: number | undefined; isActive: boolean } =
    $props();

  const sidebar = useSidebar();
  const Icon = $derived(item.icon);

  /* `Icon` (bits-ui/lucide) não expõe `ref`; um `<span>` em volta dá ao GSAP um elemento de
     verdade pra animar. */
  let iconEl: HTMLSpanElement | undefined = $state();

  /* O ícone pulsa só na TROCA para ativo. O fundo do ativo não é deste item: é o destaque que
     desliza no menu (`slidingIndicator`, na casca). */
  $effect(() => {
    if (!isActive) return;

    popIn(iconEl ?? null);
  });
</script>

<SidebarMenuItem>
  <!-- `tooltipContent` é o que salva a barra recolhida: o ícone sozinho nem sempre diz o que é. O
       componente só o mostra quando está em modo ícone. -->
  <!-- Recolhida, o botão vira um quadrado de 32px e o ícone tem 20: com o padding de 8 que
       vem do componente, ele não cabe e é cortado, parecendo empurrado para a esquerda.
       `p-0` devolve o espaço e `justify-center` o põe no meio do quadrado. -->
  <!-- O tamanho da fonte vai como `text-[1rem]`: a paleta já declarou um token de cor `base`,
       e o Tailwind lia `text-base` como COR — o menu saía invisível sobre a barra clara. O
       token saiu do tema (ver `tokens.css`), e o valor explícito fica para não depender disso. -->
  <SidebarMenuButton
    {isActive}
    tooltipContent={sidebar.state === 'collapsed' && !sidebar.isMobile ? item.label : undefined}
    size="lg"
    class="data-[active=true]:bg-transparent! text-[1rem] [&_svg]:size-5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
  >
    {#snippet child({ props })}
      <a href={item.to} {...props} aria-current={isActive ? 'page' : undefined}>
        <span bind:this={iconEl} class="contents">
          <Icon aria-hidden="true" />
        </span>
        <!-- Recolhida, a barra é só ícone: o rótulo SOME, não encolhe. Sem isto ele fica
             truncado em "T…" dentro dos 32px do botão, espremendo o ícone junto — a barra
             perde a leitura de relance e não ganha espaço nenhum. Quem diz o nome ali é o
             `tooltipContent` do SidebarMenuButton, logo acima. -->
        <span class="group-data-[collapsible=icon]:hidden">{item.label}</span>
      </a>
    {/snippet}
  </SidebarMenuButton>

  <!-- Zero não vira selo: um "0" ao lado de cada item é ruído. O `SidebarMenuBadge` some
       sozinho quando a barra está recolhida. -->
  {#if badge}
    <SidebarMenuBadge
      class="bg-destructive font-bold text-destructive-foreground shadow-xs shadow-destructive/40"
    >
      {badge}
    </SidebarMenuBadge>
  {/if}
</SidebarMenuItem>
