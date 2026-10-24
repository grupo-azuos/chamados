<script lang="ts" module>
  import type { Snippet } from 'svelte';

  /**
   * O CARD COLORIDO do grupo — o par Svelte do `AzuosToneCard` dos sistemas em React.
   *
   * A cor vem do FUNDO, nunca da borda: borda colorida é proibida em qualquer componente.
   * `static`: o fundo suave do tom, parado. `interactive`: neutro em repouso e, no hover, a cor
   * do tom entra por onde o mouse entrou (`hover-fill` + `fillFromPointer`). Selecionado: o fundo
   * na cor CHEIA do tom.
   */
  export type AzuosToneCardTone = 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';

  export type AzuosToneCardProps = {
    data?: { label?: string };
    ui?: { tone?: AzuosToneCardTone; mode?: 'static' | 'interactive'; className?: string };
    state?: { isSelected?: boolean };
    actions?: { onClick?: () => void };
    children: Snippet;
  };

  const SOFT: Record<AzuosToneCardTone, string> = {
    brand: 'bg-primary-soft text-ink-900',
    neutral: 'bg-card text-card-foreground border border-border',
    success: 'bg-success-soft text-ink-900',
    warning: 'bg-warning-soft text-ink-900',
    danger: 'bg-destructive-soft text-ink-900',
    info: 'bg-info-soft text-ink-900',
  };

  const SOLID: Record<AzuosToneCardTone, string> = {
    brand: 'bg-primary text-primary-foreground',
    neutral: 'bg-ink-700 text-primary-foreground',
    success: 'bg-success text-primary-foreground',
    warning: 'bg-warning text-primary-foreground',
    danger: 'bg-destructive text-primary-foreground',
    info: 'bg-info text-primary-foreground',
  };
</script>

<script lang="ts">
  import { fillColorOf, fillFromPointer } from '$lib/motion/hover-fill';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: cardState, actions, children }: AzuosToneCardProps = $props();

  const tone = $derived(ui?.tone ?? 'neutral');
  const isInteractive = $derived(ui?.mode === 'interactive' && !cardState?.isSelected);
  const surface = $derived(
    cardState?.isSelected
      ? SOLID[tone]
      : isInteractive
        ? 'hover-fill bg-card text-card-foreground border border-border'
        : SOFT[tone],
  );
</script>

{#snippet body()}
  {#if actions?.onClick}
    <button
      type="button"
      aria-label={data?.label}
      aria-pressed={cardState?.isSelected ?? false}
      onclick={actions.onClick}
      class="rounded-surface focus-visible:ring-ring absolute inset-0 z-10 cursor-pointer focus-visible:ring-2 focus-visible:outline-none"
    ></button>
  {/if}
  {@render children()}
{/snippet}

{#if isInteractive}
  <div
    role="group"
    aria-label={data?.label}
    use:fillFromPointer
    style:--fill-color={fillColorOf(tone)}
    class={cn('rounded-surface relative p-4 shadow-xs', surface, actions?.onClick && 'cursor-pointer', ui?.className)}
  >
    {@render body()}
  </div>
{:else}
  <div
    role="group"
    aria-label={data?.label}
    data-selected={cardState?.isSelected ? 'true' : undefined}
    class={cn('rounded-surface relative p-4 shadow-xs', surface, actions?.onClick && 'cursor-pointer', ui?.className)}
  >
    {@render body()}
  </div>
{/if}
