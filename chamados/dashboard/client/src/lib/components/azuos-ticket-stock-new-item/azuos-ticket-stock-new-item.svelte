<!--
  @component
  CADASTRAR UM ITEM NO DEPÓSITO sem sair do chamado — o formulário curto que abre dentro do
  diálogo "Vincular itens do estoque". O item nasce com a quantidade informada (uma entrada no
  depósito) e já volta marcado no vínculo.

  As peças da TI pedem a categoria e a condição; os produtos da Manutenção, a categoria e a
  medida. Função pura de props: não grava nada, só avisa.

  - `data`: `source` (de qual depósito), `values` (os campos em texto) e `errors`.
  - `state`: `isSaving` e `error` (a recusa do servidor).
  - `actions`: `onChange(campo, valor)`, `onSave` e `onCancel`.
-->
<script lang="ts" module>
  import { type TicketStockSource } from '@template/shared/domain/ticket-stock.util';

  export type TicketStockNewItemField = 'name' | 'quantity' | 'category' | 'condition' | 'unit';

  export type AzuosTicketStockNewItemProps = {
    data: {
      source: TicketStockSource;
      values: Record<TicketStockNewItemField, string>;
      errors?: Partial<Record<TicketStockNewItemField, string>>;
    };
    state?: { isSaving?: boolean; error?: string | null };
    actions: {
      onChange: (field: TicketStockNewItemField, value: string) => void;
      onSave: () => void;
      onCancel: () => void;
    };
  };
</script>

<script lang="ts">
  import { inventoryCategoryOptions, inventoryUnitOptions } from '@template/shared/domain/inventory-catalog.util';
  import {
    PART_CATEGORIES,
    PART_CONDITIONS,
    partCategoryLabel,
    partConditionLabel,
  } from '@template/shared/domain/part-catalog.util';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import SegmentedControl from '$lib/components/azuos-segmented-control/azuos-segmented-control.svelte';
  import SelectField from '$lib/components/azuos-select-field/azuos-select-field.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';

  let { data, state: formState, actions }: AzuosTicketStockNewItemProps = $props();

  const isBusy = $derived(Boolean(formState?.isSaving));
  const isParts = $derived(data.source === 'parts');
  const categoryOptions = $derived(
    isParts
      ? PART_CATEGORIES.map((value) => ({ value, label: partCategoryLabel(value) }))
      : inventoryCategoryOptions(),
  );
  const CONDITION_OPTIONS = PART_CONDITIONS.map((value) => ({ value, label: partConditionLabel(value) }));
</script>

<!-- Sem fundo próprio: os campos são cinza cheio, e cinza sobre cinza some. O bloco se separa
     da lista pelos fios. -->
<section aria-label="Cadastrar item no depósito" class="border-border flex flex-col gap-3 border-y py-3">
  <p class="text-foreground text-sm font-semibold">Cadastrar item no depósito</p>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <TextField
      data={{ label: 'Nome do item', name: 'newStockItemName', value: data.values.name, placeholder: 'Ex: Mouse USB' }}
      state={{ error: data.errors?.name, isDisabled: isBusy, isAutoFocused: true }}
      actions={{ onChange: (value: string) => actions.onChange('name', value) }}
    />
    <TextField
      data={{ label: 'Quantidade que entra', name: 'newStockItemQuantity', value: data.values.quantity }}
      ui={{ inputMode: 'numeric' }}
      state={{ error: data.errors?.quantity, isDisabled: isBusy }}
      actions={{ onChange: (value: string) => actions.onChange('quantity', value) }}
    />
    <div class="flex flex-col gap-1.5">
      <span class="text-ink-700 text-sm font-medium">Categoria</span>
      <SelectField
        data={{ value: data.values.category, options: categoryOptions }}
        ui={{ ariaLabel: 'Categoria', placeholder: 'Escolha a categoria' }}
        state={{ isDisabled: isBusy }}
        actions={{ onChange: (value: string) => actions.onChange('category', value) }}
      />
      {#if data.errors?.category}
        <p class="text-destructive text-xs">{data.errors.category}</p>
      {/if}
    </div>
    {#if isParts}
      <div class="flex flex-col gap-1.5">
        <span class="text-ink-700 text-sm font-medium">Condição</span>
        <SegmentedControl
          data={{ value: data.values.condition, options: CONDITION_OPTIONS }}
          ui={{ ariaLabel: 'Condição' }}
          state={{ isDisabled: isBusy }}
          actions={{ onChange: (value: string) => actions.onChange('condition', value) }}
        />
      </div>
    {:else}
      <div class="flex flex-col gap-1.5">
        <span class="text-ink-700 text-sm font-medium">Medida</span>
        <SelectField
          data={{ value: data.values.unit, options: inventoryUnitOptions() }}
          ui={{ ariaLabel: 'Medida' }}
          state={{ isDisabled: isBusy }}
          actions={{ onChange: (value: string) => actions.onChange('unit', value) }}
        />
      </div>
    {/if}
  </div>
  {#if formState?.error}
    <ErrorState data={{ message: formState.error }} ui={{ variant: 'inline' }} />
  {/if}
  <div class="flex justify-end gap-2">
    <ActionButton data={{ label: 'Cancelar' }} ui={{ variant: 'secondary', size: 'sm' }} state={{ isDisabled: isBusy }} actions={{ onClick: actions.onCancel }} />
    <ActionButton
      data={{ label: 'Cadastrar e marcar', loadingLabel: 'Cadastrando…' }}
      ui={{ variant: 'secondary', size: 'sm' }}
      state={{ isLoading: isBusy }}
      actions={{ onClick: actions.onSave }}
    />
  </div>
</section>
