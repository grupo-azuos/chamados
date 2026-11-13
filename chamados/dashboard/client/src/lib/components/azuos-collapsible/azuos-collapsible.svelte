<script lang="ts" module>
  import type { Snippet } from 'svelte';

  /**
   * Um bloco que abre e fecha: o título fica sempre à vista, o conteúdo aparece quando a pessoa
   * pede. Envolve o `ui/collapsible` do shadcn. Serve para o que é detalhe — filtros avançados,
   * explicação longa —, nunca para esconder o que a pessoa precisa ver para decidir.
   *
   * `state.isOpen` é só como o bloco NASCE. Depois quem manda é o clique; a tela é avisada por
   * `actions.onOpenChange` se quiser lembrar a escolha.
   */
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
  class={cn('border-border bg-card rounded-box border', ui?.className)}
>
  <CollapsibleTrigger
    class="text-ink-900 flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
  >
    <span class="break-words">{data.title}</span>
    <ChevronDown
      class={cn(
        'text-ink-500 size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none',
        isOpen && 'rotate-180',
      )}
      aria-hidden="true"
    />
  </CollapsibleTrigger>

  <!-- O conteúdo DESLIZA ao abrir e ao fechar (a altura vai de zero à do conteúdo, medida pelo
       próprio componente). O respiro mora no `div` de dentro: com ele aqui fora, a seção
       fechando ainda mostrava a faixa do padding no último quadro. Quem pediu ao sistema menos
       movimento vê abrir e fechar na hora. -->
  <CollapsibleContent
    class="border-border/60 text-ink-700 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden border-t text-sm motion-reduce:animate-none"
  >
    <div class="px-4 py-3">
      {@render children?.()}
    </div>
  </CollapsibleContent>
</Collapsible>
