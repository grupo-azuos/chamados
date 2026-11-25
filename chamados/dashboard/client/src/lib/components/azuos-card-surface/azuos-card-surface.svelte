<!--
  @component
  A SUPERFÍCIE do card de conteúdo (`AzuosContentCard`) — o andar de baixo do único card do grupo.
  Não é um formato de card: tela nenhuma monta card direto sobre ela.

  - Fundo: a superfície (`bg-card`) SEM borda; o que separa o card do fundo é o fio de 1px e a
    sombra difusa do `--elevation-card` (padrão Apple). A cor mora no ícone do assunto.
  - Hover: NADA se mexe. O card não sobe, a sombra não cresce, nada aparece por cima — clicável, só
    o cursor diz que ele abre.
  - Escolhido: o azul claro da marca (`bg-card-selected`) com texto branco.
  - Clicável: um botão de verdade cobre o card inteiro, alcançável pelo teclado.

  Nunca borda colorida, nunca fundo no tom, nunca ícone grande no canto.
-->
<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export type AzuosCardSurfaceProps = {
    data?: { label?: string };
    ui?: { className?: string };
    state?: { isSelected?: boolean; isDisabled?: boolean };
    actions?: { onClick?: () => void };
    children: Snippet;
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: cardState, actions, children }: AzuosCardSurfaceProps = $props();

  const isSelected = $derived(Boolean(cardState?.isSelected));
  const isDisabled = $derived(Boolean(cardState?.isDisabled));
  const isClickable = $derived(Boolean(actions?.onClick) && !isDisabled);
</script>

<div
  role="group"
  aria-label={data?.label}
  data-slot="azuos-card-surface"
  data-selected={isSelected ? 'true' : undefined}
  class={cn(
    'group/card rounded-surface shadow-card relative isolate overflow-hidden',
    isSelected ? 'bg-card-selected text-on-card-selected' : 'bg-card text-card-foreground',
    isClickable && 'cursor-pointer',
    ui?.className,
  )}
>
  {#if actions?.onClick}
    <button
      type="button"
      aria-label={data?.label}
      aria-pressed={isSelected}
      disabled={isDisabled}
      onclick={actions.onClick}
      class="rounded-surface focus-visible:ring-ring absolute inset-0 z-10 cursor-pointer focus-visible:ring-2 focus-visible:outline-none disabled:cursor-default"
    ></button>
  {/if}

  {@render children()}
</div>
