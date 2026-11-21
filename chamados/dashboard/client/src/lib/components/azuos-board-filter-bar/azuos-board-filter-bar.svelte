<script lang="ts" module>
  import {
    type BoardFilter,
    type BoardFilterDisplay,
    boardFilterDisplay,
    boardFilterDisplaysOf,
    BOARD_FILTER_DISPLAY_LABELS,
    BOARD_FILTER_KIND_LABELS,
    BOARD_FILTER_KINDS,
    type BoardFilterKind,
    type BoardFilterValues,
    ME_VALUE,
    type WidgetWindow,
  } from '@template/shared/schemas/dashboard-board.schema';
  import { TICKET_PRIORITIES, TICKET_STATUS_LABELS, TICKET_STATUSES, ticketPriorityLabel } from '@template/shared/domain/ticket-status.util';

  import { type FilterCounts } from '$lib/hooks/use-dashboard-board/use-dashboard-board.svelte';

  /**
   * OS FILTROS DO PAINEL — postos por quem monta, escolhidos por quem vê, e valem para TODOS os
   * blocos de uma vez (cada um só onde a fonte tem o campo). O valor escolhido é de quem está
   * vendo, e não se grava. Montando, cada filtro ganha o desenho dele (lista, etiquetas, cards) e
   * o botão de tirar, e dá para pôr os que faltam.
   */
  export type AzuosBoardFilterBarProps = {
    data: {
      filters: BoardFilter[];
      values: BoardFilterValues;
      /** A conta de cada opção, pelo id do filtro — os cards e as pessoas e departamentos da lista. */
      counts: Record<string, FilterCounts>;
    };
    state?: { isEditing?: boolean };
    actions: {
      onChange: (patch: Partial<BoardFilterValues>) => void;
      onClear: () => void;
      onAdd?: (kind: BoardFilterKind) => void;
      onRemove?: (id: string) => void;
      onDisplayChange?: (id: string, display: BoardFilterDisplay) => void;
    };
  };

  export type FilterOption = { value: string; label: string; count?: number };

  /** As janelas que o "Período" oferece — sempre dentro do teto de 90 dias. */
  export const PERIOD_CHOICES: { value: string; label: string; window: WidgetWindow }[] = [
    { value: 'last-7', label: 'Últimos 7 dias', window: { mode: 'relative', unit: 'day', count: 7, direction: 'last' } },
    { value: 'last-30', label: 'Últimos 30 dias', window: { mode: 'relative', unit: 'day', count: 30, direction: 'last' } },
    { value: 'this-month', label: 'Este mês', window: { mode: 'relative', unit: 'month', count: 1, direction: 'last' } },
    { value: 'last-3-months', label: 'Últimos 3 meses', window: { mode: 'relative', unit: 'month', count: 3, direction: 'last' } },
  ];

  /** As opções de um filtro: as fixas do contrato, ou as que a conta do módulo trouxe. */
  export function optionsOf(filter: BoardFilter, counts: FilterCounts | undefined): FilterOption[] {
    const counted = new Map((counts?.series ?? []).map((item) => [item.key, item.value]));
    if (filter.kind === 'period') return PERIOD_CHOICES.map(({ value, label }) => ({ value, label }));
    if (filter.kind === 'ticketStatus') {
      return TICKET_STATUSES.map((status) => ({ value: status, label: TICKET_STATUS_LABELS[status], count: counted.get(status) ?? 0 }));
    }
    if (filter.kind === 'ticketPriority') {
      return TICKET_PRIORITIES.map((priority) => ({ value: priority, label: ticketPriorityLabel(priority), count: counted.get(priority) ?? 0 }));
    }
    const listed = (counts?.series ?? [])
      .filter((item) => !item.key.startsWith('('))
      .map((item) => ({ value: item.key, label: item.label, count: item.value }));

    return filter.kind === 'person' ? [{ value: ME_VALUE, label: 'Eu' }, ...listed] : listed;
  }

  /** O valor do filtro como a lista o escolhe ('' é "todos"). */
  export function chosenOf(filter: BoardFilter, values: BoardFilterValues): string {
    if (filter.kind === 'period') {
      const window = values.period;

      return PERIOD_CHOICES.find((choice) => JSON.stringify(choice.window) === JSON.stringify(window))?.value ?? '';
    }

    return values[filter.kind] ?? '';
  }

  /** O que a escolha muda nos valores do painel. */
  export function patchOf(filter: BoardFilter, value: string): Partial<BoardFilterValues> {
    if (filter.kind === 'period') {
      return { period: PERIOD_CHOICES.find((choice) => choice.value === value)?.window ?? null };
    }

    return { [filter.kind]: value || null };
  }
</script>

<script lang="ts">
  import X from '@lucide/svelte/icons/x';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import SelectField from '$lib/components/azuos-select-field/azuos-select-field.svelte';
  import StatCard from '$lib/components/azuos-stat-card/azuos-stat-card.svelte';

  let { data, state: barState, actions }: AzuosBoardFilterBarProps = $props();

  const missing = $derived(BOARD_FILTER_KINDS.filter((kind) => !data.filters.some((filter) => filter.kind === kind)));
  const hasChoice = $derived(data.filters.some((filter) => chosenOf(filter, data.values) !== ''));
</script>

{#if data.filters.length > 0 || barState?.isEditing}
  <section class="flex flex-col gap-3" aria-label="Filtros do painel">
    <div class="flex flex-wrap items-end gap-3">
      {#each data.filters as filter (filter.id)}
        {@const display = boardFilterDisplay(filter)}
        {@const options = optionsOf(filter, data.counts[filter.id])}
        {@const chosen = chosenOf(filter, data.values)}
        <div class={display === 'cards' ? 'flex w-full flex-col gap-1.5' : 'flex min-w-48 flex-col gap-1.5'} role="group" aria-label={filter.label}>
          <div class="flex items-center justify-between gap-2">
            <span class="text-ink-700 text-sm font-medium">{filter.label}</span>
            {#if barState?.isEditing}
              <button
                type="button"
                class="text-ink-500 hover:bg-muted rounded-control control-icon-sm flex items-center justify-center"
                aria-label={`Tirar o filtro ${filter.label}`}
                onclick={() => actions.onRemove?.(filter.id)}
              >
                <X class="size-4" aria-hidden="true" />
              </button>
            {/if}
          </div>

          {#if display === 'cards'}
            <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
              {#each options as option (option.value)}
                <StatCard
                  data={{ label: option.label, value: option.count ?? '—' }}
                  ui={{ size: 'md' }}
                  state={{ isSelected: chosen === option.value }}
                  actions={{ onClick: () => actions.onChange(patchOf(filter, chosen === option.value ? '' : option.value)) }}
                />
              {/each}
            </div>
          {:else if display === 'chips' || display === 'list' || display === 'avatars'}
            <div class={display === 'list' ? 'flex flex-col gap-1' : 'flex flex-wrap gap-1.5'}>
              <button
                type="button"
                class="rounded-chip border-border control-sm border px-3 text-sm"
                class:bg-card-selected={chosen === ''}
                class:text-on-dark={chosen === ''}
                aria-pressed={chosen === ''}
                onclick={() => actions.onChange(patchOf(filter, ''))}
              >
                Todos
              </button>
              {#each options as option (option.value)}
                <button
                  type="button"
                  class="rounded-chip border-border control-sm border px-3 text-sm"
                  class:bg-card-selected={chosen === option.value}
                  class:text-on-dark={chosen === option.value}
                  aria-pressed={chosen === option.value}
                  onclick={() => actions.onChange(patchOf(filter, option.value))}
                >
                  {option.label}
                </button>
              {/each}
            </div>
          {:else}
            <OptionPicker
              data={{ value: chosen, options }}
              ui={{
                ariaLabel: filter.label,
                allLabel: filter.kind === 'period' ? 'O período de cada bloco' : 'Todos',
                mode: display === 'search' ? 'combobox' : 'auto',
              }}
              actions={{ onChange: (value) => actions.onChange(patchOf(filter, value)) }}
            />
          {/if}

          {#if barState?.isEditing}
            <SelectField
              data={{
                value: display,
                options: boardFilterDisplaysOf(filter.kind).map((value) => ({ value, label: BOARD_FILTER_DISPLAY_LABELS[value] })),
              }}
              ui={{ ariaLabel: `Como mostrar o filtro ${filter.label}` }}
              actions={{ onChange: (value) => actions.onDisplayChange?.(filter.id, value as BoardFilterDisplay) }}
            />
          {/if}
        </div>
      {/each}

      {#if barState?.isEditing && missing.length > 0}
        <div class="flex min-w-48 flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Pôr um filtro</span>
          <SelectField
            data={{ value: '', options: missing.map((kind) => ({ value: kind, label: BOARD_FILTER_KIND_LABELS[kind] })) }}
            ui={{ ariaLabel: 'Pôr um filtro no painel', placeholder: 'Escolha o filtro' }}
            actions={{ onChange: (kind) => actions.onAdd?.(kind as BoardFilterKind) }}
          />
        </div>
      {/if}

      {#if hasChoice}
        <ActionButton data={{ label: 'Limpar filtros' }} ui={{ variant: 'ghost', size: 'lg' }} actions={{ onClick: actions.onClear }} />
      {/if}
    </div>
  </section>
{/if}
