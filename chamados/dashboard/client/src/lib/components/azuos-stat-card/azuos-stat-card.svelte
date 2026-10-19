<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';

  /**
   * O número que se lê de relance, no alto do painel.
   *
   * Quando o cartão tem um tom (danger, info, success, brand, warning), ele ganha o fundo
   * sólido da cor correspondente sem borda (o token `-soft` do tom) no espírito
   * dos cards de dashboard modernos do VibePrompts. Sem tom escolhido (neutral), ele
   * permanece neutro com borda padrão.
   */
  export type StatCardTone = 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';

  export type AzuosStatCardProps = {
    data: {
      label: string;
      value: number | string;
      hint?: string | null;
      tooltip?: string;
    };
    ui?: {
      tone?: StatCardTone;
      size?: 'md' | 'lg';
      className?: string;
      icon?: LucideIcon;
    };
    state?: {
      isLoading?: boolean;
      /** O filtro que este cartão liga já está valendo. Só faz sentido com `actions.onClick`. */
      isSelected?: boolean;
    };
    /** Com `onClick` o cartão vira um atalho: clicar nele filtra a lista pelo que ele conta. */
    actions?: { onClick?: () => void };
  };

  /** O fundo do cartão inteiro — quando colorido, não tem borda; quando neutro, usa bg-card com borda */
  const TONE_CARD: Record<StatCardTone, string> = {
    brand: 'bg-primary-soft text-ink-900',
    neutral: 'bg-card border-border border text-card-foreground',
    success: 'bg-success-soft text-ink-900',
    warning: 'bg-warning-soft text-ink-900',
    danger: 'bg-destructive-soft text-ink-900',
    info: 'bg-info-soft text-ink-900',
  };

  const TONE_LABEL: Record<StatCardTone, string> = {
    brand: 'text-primary',
    neutral: 'text-ink-500',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
    info: 'text-info',
  };

  const TONE_VALUE: Record<StatCardTone, string> = {
    brand: 'text-ink-900',
    neutral: 'text-ink-900',
    success: 'text-ink-900',
    warning: 'text-ink-900',
    danger: 'text-ink-900',
    info: 'text-ink-900',
  };

  const TONE_ICON: Record<StatCardTone, string> = {
    brand: 'bg-primary text-primary-foreground',
    neutral: 'bg-ink-700 text-primary-foreground',
    success: 'bg-success text-primary-foreground',
    warning: 'bg-warning text-primary-foreground',
    danger: 'bg-destructive text-destructive-foreground',
    info: 'bg-info text-primary-foreground',
  };
</script>

<script lang="ts">
  import Info from '@lucide/svelte/icons/info';

  import * as Tooltip from '$lib/components/azuos-tooltip/azuos-tooltip';
  import { cn } from '$lib/utils/cn';
  import { Skeleton } from '$lib/components/ui/skeleton';

  // A prop mantém o nome público `state`, mas esse nome local faria `$state` virar
  // inscrição numa store em vez da rune do Svelte usada pelo tooltip.
  let { data, ui, state: cardState, actions }: AzuosStatCardProps = $props();

  const tone = $derived(ui?.tone ?? 'neutral');
  const Icon = $derived(ui?.icon);
  const isClickable = $derived(Boolean(actions?.onClick));
  const labelClass = $derived(
    cn('text-xs font-semibold tracking-wider uppercase', TONE_LABEL[tone]),
  );
  let isTooltipOpen = $state(false);
</script>

{#snippet labelRow(className: string)}
  <div class={className}>
    <p class={labelClass}>{data.label}</p>
    {#if data.tooltip}
      <Tooltip.Provider>
        <Tooltip.Root bind:open={isTooltipOpen}>
          <Tooltip.Trigger>
            {#snippet child({ props })}
              <button
                {...props}
                type="button"
                aria-label={`Como calculamos ${data.label.toLocaleLowerCase('pt-BR')}`}
                class="text-ink-500 hover:text-ink-700 focus-visible:ring-ring relative z-10 inline-flex size-5 shrink-0 cursor-help items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
              >
                <Info size={14} aria-hidden="true" />
              </button>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content
            role="tooltip"
            class="max-w-sm flex-col items-start gap-1 whitespace-normal text-left"
          >
            {data.tooltip}
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    {/if}
  </div>
{/snippet}

<div
  role="group"
  aria-label={data.label}
  onpointerenter={() => (isTooltipOpen = Boolean(data.tooltip))}
  onpointerleave={() => (isTooltipOpen = false)}
  class={cn(
    /* Cartão é SUPERFÍCIE: o mesmo raio do `Card`, do diálogo e da tabela
       (`lib/theme/tokens.css`). Vinha com raio de controle e encostava visualmente nos
       botões em volta. */
    'rounded-surface py-4 pr-4 pl-5 transition-all shadow-xs',
    TONE_CARD[tone],
    /* Clicável: sobe um pouco no hover, para avisar que responde ao clique. Selecionado: um
       anel em volta — o fundo já é a cor do tom, então quem marca o estado é o contorno. */
    isClickable && 'relative cursor-pointer hover:-translate-y-0.5 hover:shadow-xl',
    cardState?.isSelected && 'ring-ring ring-offset-background ring-2 ring-offset-2',
    ui?.className,
  )}
>
  <!-- O clique é um BOTÃO de verdade, estendido por cima do cartão inteiro: alcançável pelo
       teclado e anunciado pelo leitor de tela, sem trocar a marcação do cartão (parágrafo
       dentro de botão não é HTML válido). -->
  {#if isClickable}
    <button
      type="button"
      class="rounded-surface absolute inset-0 cursor-pointer"
      aria-pressed={Boolean(cardState?.isSelected)}
      aria-label={cardState?.isSelected
        ? `${data.label}: tirar o filtro`
        : `${data.label}: filtrar a lista`}
      onclick={actions?.onClick}
    ></button>
  {/if}

  {#if Icon}
    <div class="mb-2 flex items-center gap-2.5">
      <span
        class={cn('flex size-8 shrink-0 items-center justify-center rounded-chip', TONE_ICON[tone])}
      >
        <Icon size={15} aria-hidden="true" />
      </span>
      {@render labelRow('flex min-w-0 items-center gap-1')}
    </div>
  {:else}
    {@render labelRow('mb-1 flex items-center gap-1')}
  {/if}

  {#if cardState?.isLoading}
    <Skeleton class="mt-1 h-8 w-20" />
  {:else}
    <div class="flex flex-wrap items-baseline gap-x-2">
      <p
        class={cn(
          'font-bold tabular-nums',
          ui?.size === 'lg' ? 'text-4xl' : 'text-3xl font-semibold tracking-tight',
          TONE_VALUE[tone],
        )}
      >
        {data.value}
      </p>

      {#if data.hint}
        <p class={cn('text-xs mt-0.5', TONE_LABEL[tone])}>{data.hint}</p>
      {/if}
    </div>
  {/if}
</div>
