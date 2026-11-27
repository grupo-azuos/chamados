<!--
  @component
  VINCULAR ITENS DO ESTOQUE a uma máquina do chamado — 1 máquina para vários itens. De um lado as
  máquinas do chamado (escolhe-se uma; sem máquina, os itens vão sem); do outro os itens do
  depósito, com busca, cada um com a quantidade. No topo, saída, entrada ou DESCARTE (com o motivo).
  "Vincular" grava todos de uma vez, e embaixo o diálogo diz o que vai ficar: "Computador 01 → 3
  itens". Item que ainda não existe no depósito se cadastra ali mesmo ("Cadastrar item") e já volta
  marcado.

  - `data`: `machines`, `machineId`, `direction`, `options` (já filtradas pela busca e pelo
    sentido), `search`, `selection` (item → quantidade) e `errors` (por item).
  - `state`: `isOpen`, `isSaving`, `error`.
  - `actions`: `onMachineChange`, `onDirectionChange`, `onReasonChange`, `onSearch`, `onToggle`,
    `onQuantityChange`, `onApply`, `onClose` e, com `newItem`, as do cadastro (`newItem.*`).
-->
<script lang="ts" module>
  import {
    TICKET_STOCK_DIRECTIONS,
    ticketStockDirectionLabel,
    type TicketStockDirection,
  } from '@template/shared/domain/ticket-stock.util';
  import { type TicketStockOption } from '@template/shared/schemas/ticket-stock-item.schema';
  import { DISPOSAL_REASONS, disposalReasonLabel } from '@template/shared/domain/inventory-stock.util';
  import { type AzuosTicketStockNewItemProps } from '$lib/components/azuos-ticket-stock-new-item/azuos-ticket-stock-new-item.svelte';

  export type AzuosTicketStockLinkDialogProps = {
    data: {
      machines: { value: string; label: string }[];
      /** A máquina escolhida; vazio é "sem máquina". */
      machineId: string;
      direction: TicketStockDirection;
      options: TicketStockOption[];
      search: string;
      selection: Record<string, string>;
      errors?: Record<string, string>;
      /** O nome do depósito — "Depósito da TI". */
      shelfLabel?: string;
      /** O motivo do descarte (só no descarte). */
      reason?: string;
      reasonError?: string | null;
      /** O cadastro de item na hora: aberto, com os campos; nulo, só o botão. */
      newItem?: {
        source: AzuosTicketStockNewItemProps['data']['source'];
        isOpen: boolean;
        values: AzuosTicketStockNewItemProps['data']['values'];
        errors?: AzuosTicketStockNewItemProps['data']['errors'];
      } | null;
    };
    state?: {
      isOpen?: boolean;
      isSaving?: boolean;
      error?: string | null;
      isCreating?: boolean;
      createError?: string | null;
    };
    actions: {
      onMachineChange: (id: string) => void;
      onDirectionChange: (direction: TicketStockDirection) => void;
      onSearch: (value: string) => void;
      onToggle: (itemId: string) => void;
      onQuantityChange: (itemId: string, value: string) => void;
      onApply: () => void;
      onClose: () => void;
      onReasonChange?: (reason: string) => void;
      newItem?: {
        onOpen: () => void;
        onChange: AzuosTicketStockNewItemProps['actions']['onChange'];
        onSave: () => void;
        onCancel: () => void;
      };
    };
  };

  const REASON_OPTIONS = DISPOSAL_REASONS.map((reason) => ({ value: reason, label: disposalReasonLabel(reason) }));

  const DIRECTION_OPTIONS = TICKET_STOCK_DIRECTIONS.map((direction) => ({
    value: direction,
    label: ticketStockDirectionLabel(direction),
  }));

  /** "Computador 01 → 3 itens" — o rodapé diz o vínculo que vai ficar. */
  export function linkSummary(machineName: string | null, count: number): string {
    const items = count === 1 ? '1 item' : `${count} itens`;

    return `${machineName ?? 'Sem máquina'} → ${items}`;
  }
</script>

<script lang="ts">
  import Monitor from '@lucide/svelte/icons/monitor';
  import PackageSearch from '@lucide/svelte/icons/package-search';
  import Plus from '@lucide/svelte/icons/plus';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/azuos-dialog/azuos-dialog';
  import CheckboxField from '$lib/components/azuos-checkbox-field/azuos-checkbox-field.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import DialogContent from '$lib/components/azuos-responsive-dialog-content/azuos-responsive-dialog-content.svelte';
  import SegmentedControl from '$lib/components/azuos-segmented-control/azuos-segmented-control.svelte';
  import SelectField from '$lib/components/azuos-select-field/azuos-select-field.svelte';
  import NewItemForm from '$lib/components/azuos-ticket-stock-new-item/azuos-ticket-stock-new-item.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';

  let { data, state: dialogState, actions }: AzuosTicketStockLinkDialogProps = $props();

  const isBusy = $derived(Boolean(dialogState?.isSaving));
  const count = $derived(Object.keys(data.selection).length);
  const machineName = $derived(data.machines.find((machine) => machine.value === data.machineId)?.label ?? null);
  const machineChoices = $derived(
    [{ value: '', label: '(Sem máquina)' }, ...data.machines].map((machine) => ({ ...machine, icon: Monitor })),
  );
</script>

<Dialog open={dialogState?.isOpen ?? true} onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}>
  <DialogContent class="sm:max-w-5xl">
    <DialogHeader>
      <DialogTitle>Vincular itens do estoque</DialogTitle>
      <DialogDescription>
        Escolha a máquina e marque os itens que vão para ela, voltam dela ou vão para o descarte, no
        {data.shelfLabel ?? 'depósito'}. O saldo só muda quando o chamado for encerrado.
      </DialogDescription>
    </DialogHeader>

    <SegmentedControl
      data={{ value: data.direction, options: DIRECTION_OPTIONS }}
      ui={{ ariaLabel: 'Movimento' }}
      state={{ isDisabled: isBusy }}
      actions={{ onChange: (value) => actions.onDirectionChange(value as TicketStockDirection) }}
    />

    {#if data.direction === 'disposal' && actions.onReasonChange}
      <!-- O motivo vale para todos os itens marcados: é por ele que o painel conta as perdas. -->
      <div class="flex max-w-xs flex-col gap-1.5">
        <span class="text-ink-700 text-sm font-medium">Motivo do descarte</span>
        <SelectField
          data={{ value: data.reason ?? '', options: REASON_OPTIONS }}
          ui={{ ariaLabel: 'Motivo do descarte', placeholder: 'Escolha o motivo' }}
          state={{ isDisabled: isBusy }}
          actions={{ onChange: actions.onReasonChange }}
        />
        {#if data.reasonError}
          <p class="text-destructive text-xs">{data.reasonError}</p>
        {/if}
      </div>
    {/if}

    <!-- A máquina é um campo de escolha da casa (pastilhas quando são poucas, lista com busca
         quando são muitas); os itens, uma lista de caixas de marcar com a quantidade ao lado. -->
    <div class="flex flex-col gap-4">
      <FilterField data={{ label: 'Máquina' }}>
        <OptionPicker
          data={{ value: data.machineId, options: machineChoices }}
          ui={{ ariaLabel: 'Máquina', searchPlaceholder: 'Buscar máquina…' }}
          state={{ isDisabled: isBusy }}
          actions={{ onChange: actions.onMachineChange }}
        />
      </FilterField>

      <section class="flex min-w-0 flex-col gap-2" aria-label="Itens">
        <div class="flex items-end gap-2">
          <div class="min-w-0 flex-1">
            <TextField
              data={{ label: 'Itens', name: 'stockLinkSearch', value: data.search, placeholder: 'Buscar item…' }}
              actions={{ onChange: actions.onSearch }}
            />
          </div>
          {#if data.newItem && actions.newItem && !data.newItem.isOpen}
            <ActionButton
              data={{ label: 'Cadastrar item' }}
              ui={{ variant: 'secondary', icon: Plus }}
              state={{ isDisabled: isBusy }}
              actions={{ onClick: actions.newItem.onOpen }}
            />
          {/if}
        </div>
        {#if data.newItem?.isOpen && actions.newItem}
          <NewItemForm
            data={{ source: data.newItem.source, values: data.newItem.values, errors: data.newItem.errors }}
            state={{ isSaving: dialogState?.isCreating, error: dialogState?.createError }}
            actions={{ onChange: actions.newItem.onChange, onSave: actions.newItem.onSave, onCancel: actions.newItem.onCancel }}
          />
        {/if}
        {#if data.options.length === 0}
          <EmptyState
            data={{
              title: 'Nenhum item',
              description:
                data.direction === 'in' ? 'Nada com esse nome. Cadastre o item.' : 'Nada com saldo com esse nome.',
            }}
            ui={{ icon: PackageSearch }}
          />
        {:else}
          <ul class="divide-border flex max-h-[45vh] flex-col divide-y overflow-y-auto" aria-label="Itens do estoque">
            {#each data.options as option (option.id)}
              {@const key = String(option.id)}
              {@const isSelected = key in data.selection}
              <li class="flex flex-col gap-2 px-1 py-2 sm:flex-row sm:items-start sm:justify-between">
                <CheckboxField
                  data={{
                    label: option.name,
                    name: `stockItem${key}`,
                    isChecked: isSelected,
                    description: `${option.available} ${option.available === 1 ? 'disponível' : 'disponíveis'}`,
                  }}
                  state={{ isDisabled: isBusy }}
                  actions={{ onChange: () => actions.onToggle(key) }}
                />
                {#if isSelected}
                  <TextField
                    data={{ label: `Quantidade de ${option.name}`, name: `stockQty${key}`, value: data.selection[key] ?? '1' }}
                    ui={{ inputMode: 'numeric', className: 'sm:w-48' }}
                    state={{ error: data.errors?.[key], isDisabled: isBusy }}
                    actions={{ onChange: (value: string) => actions.onQuantityChange(key, value) }}
                  />
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    </div>

    {#if dialogState?.error}
      <ErrorState data={{ message: dialogState.error }} ui={{ variant: 'inline' }} />
    {/if}

    <DialogFooter class="items-center gap-2 sm:justify-between">
      <p class="text-ink-700 text-sm font-medium" role="status">{linkSummary(machineName, count)}</p>
      <div class="flex gap-2">
        <ActionButton data={{ label: 'Cancelar' }} ui={{ variant: 'secondary' }} state={{ isDisabled: isBusy }} actions={{ onClick: actions.onClose }} />
        <ActionButton
          data={{ label: count > 0 ? `Vincular ${count}` : 'Vincular', loadingLabel: 'Vinculando…' }}
          state={{ isLoading: isBusy, isDisabled: count === 0 }}
          actions={{ onClick: actions.onApply }}
        />
      </div>
    </DialogFooter>
  </DialogContent>
</Dialog>
