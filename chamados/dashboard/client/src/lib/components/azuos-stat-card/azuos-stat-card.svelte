<!--
  @component
  O CARD DE PAINEL e o FILTRO GRANDE com ícone: o número que se lê de relance.

  Fica na superfície da marca (`AzuosCardSurface`). O tom mora no ícone cheio (`rounded-icon`); o
  número fica na cor do texto, grande, em negrito e com `tabular-nums`. Com `onClick` vira filtro, e
  o escolhido usa o destaque de seleção da superfície. O tom aceita o nome de estado (`danger`…) ou
  o sotaque (`plum`…); a cor que a PESSOA escolheu (`ui.color`) vira o tom mais próximo.

  `hint` existe para o número que EXCLUI algo — "exclui 1.067 arquivados", escrito miúdo ao lado do
  total. Um número que exclui algo precisa dizer o que excluiu. `tooltip` põe o "i" ao lado do
  rótulo, com a explicação de como o número é calculado.

  - `data`: rótulo, valor, `hint` e `tooltip`.
  - `ui`: tom, tamanho (`md` ou `lg`), ícone, cor da pessoa e classes extras. O hover é sempre o
    véu neutro da superfície.
  - `state`: carregando e `isSelected`, quando o filtro deste cartão já está valendo.
  - `actions`: `onClick`, que faz o cartão filtrar a lista pelo que ele conta.
-->
<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';

  import { type AzuosCardTone } from '$lib/utils/card-tone.util';

  export type StatCardTone = AzuosCardTone;

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
      /** Uma cor escolhida pela pessoa (`#rrggbb`): vira o tom mais próximo da paleta. */
      color?: string | null;
    };
    state?: {
      isLoading?: boolean;
      /** O filtro que este cartão liga já está valendo. Só faz sentido com `actions.onClick`. */
      isSelected?: boolean;
    };
    /** Com `onClick` o cartão vira um atalho: clicar nele filtra a lista pelo que ele conta. */
    actions?: { onClick?: () => void };
  };
</script>

<script lang="ts">
  import Info from '@lucide/svelte/icons/info';

  import AzuosCardSurface from '$lib/components/azuos-card-surface/azuos-card-surface.svelte';
  import * as Tooltip from '$lib/components/azuos-tooltip/azuos-tooltip';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { cardHueFromHex, cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';

  // A prop mantém o nome público `state`, mas esse nome local faria `$state` virar
  // inscrição numa store em vez da rune do Svelte usada pelo tooltip.
  let { data, ui, state: cardState, actions }: AzuosStatCardProps = $props();

  const tone = $derived(ui?.color ? cardHueFromHex(ui.color) : (ui?.tone ?? 'neutral'));
  const classes = $derived(cardToneClasses(tone));
  const Icon = $derived(ui?.icon);
  const isSelected = $derived(Boolean(cardState?.isSelected));
  /* O nome lido pelo leitor de tela leva o número, e diz o que o próximo clique faz. */
  const label = $derived(
    actions?.onClick
      ? `${data.label} ${data.value}: ${isSelected ? 'tirar o filtro' : 'filtrar a lista'}`
      : data.label,
  );
  let isTooltipOpen = $state(false);
</script>

{#snippet labelRow(className: string)}
  <div class={className}>
    <p
      class="text-muted-foreground group-data-[selected=true]/card:text-on-card-selected text-sm leading-tight font-medium"
    >
      {data.label}
    </p>
    {#if data.tooltip}
      <Tooltip.Provider>
        <Tooltip.Root bind:open={isTooltipOpen}>
          <Tooltip.Trigger>
            {#snippet child({ props })}
              <button
                {...props}
                type="button"
                aria-label={`Como calculamos ${data.label.toLocaleLowerCase('pt-BR')}`}
                class="text-muted-foreground hover:text-foreground focus-visible:ring-ring relative z-20 inline-flex size-5 shrink-0 cursor-help items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
              >
                <Info size={14} aria-hidden="true" />
              </button>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content
            role="tooltip"
            class="max-w-sm flex-col items-start gap-1 text-left whitespace-normal"
          >
            {data.tooltip}
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    {/if}
  </div>
{/snippet}

<div
  role="presentation"
  onpointerenter={() => (isTooltipOpen = Boolean(data.tooltip))}
  onpointerleave={() => (isTooltipOpen = false)}
  class="contents"
>
  <AzuosCardSurface
    data={{ label }}
    ui={{
      className: cn('p-5', ui?.className),
    }}
    state={{ isSelected, isDisabled: cardState?.isLoading }}
    {actions}
  >
    {#if Icon}
      <div class="mb-3 flex items-center gap-2.5">
        <span
          class={cn(
            'rounded-icon inline-flex size-10 shrink-0 items-center justify-center shadow-xs',
            'group-data-[selected=true]/card:bg-on-card-selected group-data-[selected=true]/card:text-card-selected',
            classes.dot,
          )}
        >
          <Icon size={18} class="block size-4.5 shrink-0 stroke-[1.8]" aria-hidden="true" />
        </span>
        {@render labelRow('flex min-w-0 items-center gap-1')}
      </div>
    {:else}
      {@render labelRow('mb-1.5 flex items-center gap-1')}
    {/if}

    {#if cardState?.isLoading}
      <Skeleton class="mt-1 h-8 w-20" />
    {:else}
      <div class="flex flex-wrap items-baseline gap-x-2">
        <p
          class={cn(
            /* Padrão Apple: o número fica na cor do texto; a cor do assunto mora no ícone. */
            'text-foreground group-data-[selected=true]/card:text-on-card-selected font-bold tabular-nums',
            ui?.size === 'lg' ? 'text-4xl' : 'text-3xl tracking-tight',
          )}
        >
          {data.value}
        </p>

        {#if data.hint}
          <p
            class="text-muted-foreground group-data-[selected=true]/card:text-on-card-selected mt-0.5 text-xs"
          >
            {data.hint}
          </p>
        {/if}
      </div>
    {/if}
  </AzuosCardSurface>
</div>
