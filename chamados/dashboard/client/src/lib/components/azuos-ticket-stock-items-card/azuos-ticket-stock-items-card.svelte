<script lang="ts" module>
  import {
    TICKET_STOCK_DIRECTIONS,
    ticketStockDirectionLabel,
    type TicketStockDirection,
  } from '@template/shared/domain/ticket-stock.util';
  import {
    type TicketStockItem,
    type TicketStockItemFormValues,
    type TicketStockOption,
  } from '@template/shared/schemas/ticket-stock-item.schema';

  export type TicketStockField = keyof TicketStockItemFormValues;

  /**
   * OS ITENS DE ESTOQUE na ficha do chamado — além da máquina, o que o atendimento tira do
   * depósito (saída) ou devolve a ele (entrada), quantos forem.
   *
   * O item fica RESERVADO enquanto o chamado está aberto: o saldo do depósito só anda no
   * encerramento. Com o chamado encerrado, a lista vira só leitura — para mexer, reabre-se.
   *
   * Função pura de props: os itens, as opções e o que está sendo digitado chegam prontos do
   * view-model (`use-ticket-stock-items`).
   */
  export type AzuosTicketStockItemsCardProps = {
    data: {
      items: TicketStockItem[];
      options: TicketStockOption[];
      values: TicketStockItemFormValues;
      errors?: Partial<Record<TicketStockField, string>>;
    };
    ui?: {
      /** O nome do depósito na tela — "Depósito da TI", "Depósito da Manutenção". */
      shelfLabel?: string;
    };
    state?: {
      isClosed?: boolean;
      isLoading?: boolean;
      isAdding?: boolean;
      removingId?: number | null;
      error?: string | null;
    };
    actions: {
      onChange: (field: TicketStockField, value: string) => void;
      onSubmit: () => void;
      onRemove: (id: number) => void;
    };
  };

  const DIRECTION_OPTIONS = TICKET_STOCK_DIRECTIONS.map((direction) => ({
    value: direction,
    label: ticketStockDirectionLabel(direction),
    tone: direction === 'out' ? ('warning' as const) : ('success' as const),
  }));

  /**
   * As opções do item conforme o sentido. Na SAÍDA só entra o que ainda sobra (com a sobra no
   * nome, para a pessoa não pedir mais do que existe); na ENTRADA, qualquer item do depósito.
   */
  export function itemOptionsFor(
    options: readonly TicketStockOption[],
    direction: TicketStockDirection,
  ): { value: string; label: string }[] {
    if (direction === 'in') {
      return options.map((option) => ({ value: String(option.id), label: option.name }));
    }

    return options
      .filter((option) => option.available > 0)
      .map((option) => ({
        value: String(option.id),
        label: `${option.name} — ${option.available} ${option.available === 1 ? 'disponível' : 'disponíveis'}`,
      }));
  }
</script>

<script lang="ts">
  import XIcon from '@lucide/svelte/icons/x';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';

  let { data, ui, state: cardState, actions }: AzuosTicketStockItemsCardProps = $props();

  const direction = $derived(data.values.direction);
  const itemOptions = $derived(itemOptionsFor(data.options, direction));
  const isBusy = $derived(Boolean(cardState?.isAdding));

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }
</script>

<div class="border-border/70 flex flex-col gap-3 border-t pt-4">
  <div>
    <p class="text-ink-700 text-sm font-medium">Itens do estoque</p>
    <p class="text-muted-foreground text-xs">
      O que sai ou volta para o {ui?.shelfLabel ?? 'depósito'}. O saldo só muda quando o chamado
      for encerrado.
    </p>
  </div>

  {#if cardState?.isLoading}
    <p class="text-muted-foreground text-xs">Carregando os itens…</p>
  {:else if data.items.length === 0}
    <p class="text-muted-foreground/70 text-xs">Nenhum item do estoque neste chamado.</p>
  {:else}
    <ul class="divide-border/70 flex flex-col divide-y rounded-box border">
      {#each data.items as item (item.id)}
        <li class="flex items-center gap-2 p-2">
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <p class="text-ink-900 truncate text-sm" title={item.name}>{item.name}</p>
            <div class="flex flex-wrap items-center gap-1.5 text-xs">
              <StatusBadge
                data={{ label: ticketStockDirectionLabel(item.direction) }}
                ui={{ tone: item.direction === 'out' ? 'warning' : 'success', size: 'sm' }}
              />
              <span class="text-ink-700 font-medium">{item.quantity} un.</span>
              <span class="text-muted-foreground">
                · {item.settledAt ? 'baixado no depósito' : 'reservado'}
              </span>
            </div>
          </div>

          {#if !cardState?.isClosed}
            <ActionButton
              data={{ label: `Tirar ${item.name} do chamado` }}
              ui={{ variant: 'ghost', size: 'sm', icon: XIcon, isIconOnly: true }}
              state={{
                isDisabled: cardState?.removingId === item.id,
                isLoading: cardState?.removingId === item.id,
              }}
              actions={{ onClick: () => actions.onRemove(item.id) }}
            />
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  {#if cardState?.isClosed}
    <p class="text-muted-foreground text-xs">
      Chamado encerrado: para tirar ou colocar itens, reabra o chamado.
    </p>
  {:else}
    <form novalidate class="flex flex-col gap-3" onsubmit={handleSubmit}>
      <FilterField data={{ label: 'Movimento' }}>
        <OptionPicker
          data={{ value: direction, options: DIRECTION_OPTIONS }}
          ui={{ ariaLabel: 'Movimento do item', fullWidth: true }}
          state={{ isDisabled: isBusy }}
          actions={{ onChange: (value: string) => actions.onChange('direction', value) }}
        />
      </FilterField>

      <FilterField data={{ label: 'Item' }}>
        <OptionPicker
          data={{ value: data.values.itemId, options: itemOptions }}
          ui={{
            ariaLabel: 'Item do estoque',
            placeholder: direction === 'out' ? 'Escolha o que sai' : 'Escolha o que volta',
            fullWidth: true,
            mode: 'combobox',
            searchPlaceholder: 'Buscar item…',
            showSelectedTooltip: true,
          }}
          state={{ isDisabled: isBusy, error: data.errors?.itemId }}
          actions={{ onChange: (value: string) => actions.onChange('itemId', value) }}
        />
      </FilterField>

      <div class="flex items-end gap-2">
        <TextField
          data={{ label: 'Quantidade', name: 'stockQuantity', value: data.values.quantity }}
          ui={{ inputMode: 'numeric', className: 'w-28' }}
          state={{ error: data.errors?.quantity, isDisabled: isBusy }}
          actions={{ onChange: (value: string) => actions.onChange('quantity', value) }}
        />
        <ActionButton
          data={{ label: 'Adicionar item', loadingLabel: 'Adicionando…' }}
          ui={{ variant: 'secondary', size: 'lg', className: 'ml-auto' }}
          state={{ isLoading: isBusy }}
          actions={{ onClick: actions.onSubmit }}
        />
      </div>
    </form>
  {/if}

  {#if cardState?.error}
    <ErrorState data={{ message: cardState.error }} ui={{ variant: 'inline' }} />
  {/if}
</div>
