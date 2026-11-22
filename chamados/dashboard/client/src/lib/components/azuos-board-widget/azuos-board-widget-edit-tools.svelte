<script lang="ts" module>
  import { type Widget } from '@template/shared/schemas/dashboard-board.schema';

  /**
   * As ferramentas do bloco em edição: o peso na cota, trocar o gráfico, configurar e — separado,
   * e pedindo confirmação — remover. A lixeira fica longe das ações frequentes (Fitts).
   */
  export type AzuosBoardWidgetEditToolsProps = {
    data: { widget: Widget };
    actions: {
      onEdit: (id: string) => void;
      onRemove: (id: string) => void;
      onChangeKind?: (id: string, kind: Widget['kind']) => void;
    };
  };
</script>

<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Settings2 from '@lucide/svelte/icons/settings-2';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import {
    WIDGET_WEIGHTS,
    weightLabel,
    widgetWeight,
  } from '@template/shared/schemas/dashboard-board.schema';

  import AzuosActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/azuos-popover/azuos-popover';
  import { cn } from '$lib/utils/cn';
  import { MAIN_KINDS, OTHER_KINDS, WIDGET_KIND_LOOK } from '$lib/utils/widget-kind.util';

  let { data, actions }: AzuosBoardWidgetEditToolsProps = $props();

  let isArmed = $state(false);
  let isKindOpen = $state(false);
  const widget = $derived(data.widget);
  const current = $derived(WIDGET_KIND_LOOK[widget.kind]);
  const weight = $derived(weightLabel(widgetWeight(widget)));

  function pick(kind: Widget['kind']) {
    actions.onChangeKind?.(widget.id, kind);
    isKindOpen = false;
  }
</script>

{#snippet kindGroup(title: string, kinds: readonly Widget['kind'][])}
  <div role="radiogroup" aria-label={title} class="p-1">
    <p class="text-ink-500 px-1 pb-1 text-xs font-medium">{title}</p>
    <div class="grid grid-cols-2 gap-1">
      {#each kinds as kind (kind)}
        {@const look = WIDGET_KIND_LOOK[kind]}
        {@const isChosen = kind === widget.kind}
        <button
          type="button"
          role="radio"
          aria-checked={isChosen}
          {...{ 'aria-description': weightLabel(WIDGET_WEIGHTS[kind]) }}
          onclick={() => pick(kind)}
          class={cn(
            'control-lg rounded-control flex items-center gap-2 text-left text-xs font-semibold',
            isChosen ? 'bg-primary text-primary-foreground' : 'text-ink-900 hover:bg-muted',
          )}
        >
          <look.icon class="size-4" aria-hidden="true" />
          <span class="min-w-0 flex-1 truncate">{look.short}</span>
          <!-- O peso de cada tipo ao trocar o gráfico; o leitor de tela o ouve na descrição. -->
          <span
            aria-hidden="true"
            class={cn('shrink-0 pr-1 font-medium', isChosen ? 'text-primary-foreground' : 'text-ink-500')}
          >
            {WIDGET_WEIGHTS[kind]} pt
          </span>
        </button>
      {/each}
    </div>
  </div>
{/snippet}

<!-- O peso do bloco na cota do painel, à vista de quem monta — é o que se gasta com ele. -->
<span
  aria-label={`Peso: ${weight}`}
  class="rounded-chip bg-muted text-ink-700 shrink-0 px-2 py-0.5 text-xs font-semibold whitespace-nowrap"
>
  {weight}
</span>
{#if actions.onChangeKind}
  <!-- Trocar o gráfico sem abrir o editor: os mais usados primeiro, os outros embaixo (Hick). -->
  <Popover bind:open={isKindOpen}>
    <PopoverTrigger
      aria-label={`Trocar o gráfico de ${widget.title}`}
      class="control-lg rounded-control bg-muted text-ink-900 hover:bg-accent focus-visible:ring-ring/50 flex items-center gap-1.5 text-xs font-semibold focus-visible:ring-[3px] focus-visible:outline-none"
    >
      <current.icon class="text-primary size-4" aria-hidden="true" />
      <span class="hidden sm:inline">{current.short}</span>
      <ChevronDown class="text-ink-500 size-3.5" aria-hidden="true" />
    </PopoverTrigger>
    <PopoverContent
      align="end"
      class="rounded-surface border-transparent bg-popover ring-foreground/8 w-64 p-2 shadow-xl ring-1"
    >
      {@render kindGroup('Mais usados', MAIN_KINDS)}
      {@render kindGroup('Outros', OTHER_KINDS)}
    </PopoverContent>
  </Popover>
{/if}
<AzuosActionButton
  data={{ label: `Configurar ${widget.title}` }}
  ui={{ variant: 'ghost', icon: Settings2, isIconOnly: true }}
  actions={{ onClick: () => actions.onEdit(widget.id) }}
/>
<span class="border-border ml-2 border-l pl-2">
  {#if isArmed}
    <AzuosActionButton
      data={{ label: 'Remover?' }}
      ui={{ variant: 'danger', size: 'sm', icon: Trash2 }}
      actions={{ onClick: () => actions.onRemove(widget.id) }}
    />
  {:else}
    <AzuosActionButton
      data={{ label: `Remover ${widget.title}` }}
      ui={{ variant: 'ghost', icon: Trash2, isIconOnly: true }}
      actions={{ onClick: () => (isArmed = true) }}
    />
  {/if}
</span>
