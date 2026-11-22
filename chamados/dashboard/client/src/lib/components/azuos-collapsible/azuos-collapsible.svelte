<!--
  @component
  Um bloco que abre e fecha: o título fica sempre à vista, o conteúdo aparece quando a pessoa
  pede. Envolve o `ui/collapsible` do shadcn. Serve para o que é detalhe — filtros avançados,
  explicação longa —, nunca para esconder o que a pessoa precisa ver para decidir.

  `state.isOpen` é só como o bloco NASCE. Depois quem manda é o clique; a tela é avisada por
  `actions.onOpenChange` se quiser lembrar a escolha.

  - `data`: o título.
  - `ui`: classe extra.
  - `state`: `isOpen` (como nasce) e desligado.
  - `actions`: `onOpenChange`.
  - `children`: o conteúdo.
-->
<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export type AzuosCollapsibleProps = {
    data: { title: string };
    ui?: { className?: string };
    state?: { isOpen?: boolean; isDisabled?: boolean };
    actions?: { onOpenChange?: (isOpen: boolean) => void };
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

  let { data, ui, state: blockState, actions, children }: AzuosCollapsibleProps = $props();

  /* `$state` puramente visual: aberto ou fechado. */
  let isOpen = $state(untrack(() => blockState?.isOpen ?? false));
</script>

<Collapsible
  bind:open={isOpen}
  disabled={blockState?.isDisabled}
  onOpenChange={(next) => actions?.onOpenChange?.(next)}
  class={cn('rounded-box bg-card shadow-card', ui?.className)}
>
  <CollapsibleTrigger
    class="text-foreground rounded-box hover:bg-hover-veil flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
  >
    <span class="break-words">{data.title}</span>
    <ChevronDown
      class={cn(
        'text-muted-foreground size-4 shrink-0 transition-transform duration-300 ease-out',
        isOpen && 'rotate-180',
      )}
      aria-hidden="true"
    />
  </CollapsibleTrigger>

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
