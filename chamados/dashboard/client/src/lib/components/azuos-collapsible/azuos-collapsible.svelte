<!--
  @component
  Um bloco que abre e fecha: o título fica sempre à vista, o conteúdo aparece quando a pessoa
  pede. Envolve o `ui/collapsible` do shadcn. Serve para o que é detalhe — filtros avançados,
  explicação longa —, nunca para esconder o que a pessoa precisa ver para decidir.

  `state.isOpen` é só como o bloco NASCE. Depois quem manda é o clique; a tela é avisada por
  `actions.onOpenChange` se quiser lembrar a escolha.

  `data.badge` é um selo curto ao lado do título ("2 ativos"), para o bloco fechado ainda dizer que
  há algo dentro. `aside` é uma ação na ponta direita do cabeçalho ("Limpar filtros"): fica FORA
  do botão que abre e fecha (botão dentro de botão não existe), e com ela a seta vai para junto do
  título — a ponta direita é da ação.

  - `data`: o título e o selo.
  - `ui`: classe extra.
  - `state`: `isOpen` (como nasce) e desligado.
  - `actions`: `onOpenChange`.
  - `aside`: a ação do cabeçalho.
  - `children`: o conteúdo.
-->
<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export type AzuosCollapsibleProps = {
    data: { title: string; badge?: string };
    ui?: { className?: string };
    state?: { isOpen?: boolean; isDisabled?: boolean };
    actions?: { onOpenChange?: (isOpen: boolean) => void };
    aside?: Snippet;
    children?: Snippet;
  };
</script>

<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { untrack } from 'svelte';

  import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
  } from '$lib/components/ui/collapsible';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: blockState, actions, aside, children }: AzuosCollapsibleProps = $props();

  /* `$state` puramente visual: aberto ou fechado. */
  let isOpen = $state(untrack(() => blockState?.isOpen ?? false));
</script>

<Collapsible
  bind:open={isOpen}
  disabled={blockState?.isDisabled}
  onOpenChange={(next) => actions?.onOpenChange?.(next)}
  class={cn('rounded-box bg-card shadow-card', ui?.className)}
>
  <div class="flex items-center gap-2">
    <CollapsibleTrigger
      class={cn(
        'text-foreground rounded-box hover:bg-hover-veil flex w-full min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        aside ? 'justify-start' : 'justify-between',
      )}
    >
      <span class="flex min-w-0 flex-wrap items-center gap-2">
        <span class="break-words">{data.title}</span>
        {#if data.badge}
          <span class="rounded-chip bg-primary-soft text-primary px-2 py-0.5 text-xs font-semibold tabular-nums">{data.badge}</span>
        {/if}
      </span>
      <ChevronDown
        class={cn(
          'text-muted-foreground size-4 shrink-0 transition-transform duration-300 ease-out',
          isOpen && 'rotate-180',
        )}
        aria-hidden="true"
      />
    </CollapsibleTrigger>
    {#if aside}
      <div class="flex shrink-0 items-center pr-3">{@render aside()}</div>
    {/if}
  </div>

  <!-- ABRIR E FECHAR ANIMADOS: a caixa desliza na altura do conteúdo (a altura vem do bits-ui,
       medida pelo próprio componente) e o texto entra subindo e aparecendo. O respiro mora no
       filho, porque padding na caixa que anima a altura dá um tranco no fim. Quem pediu menos
       movimento vê abrir na hora (`motion-safe`). -->
  <CollapsibleContent
    class="data-[state=open]:motion-safe:animate-collapsible-down data-[state=closed]:motion-safe:animate-collapsible-up overflow-hidden"
  >
    <div
      class="border-border text-foreground/85 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 border-t px-4 py-3 text-sm motion-safe:duration-300"
    >
      {@render children?.()}
    </div>
  </CollapsibleContent>
</Collapsible>
