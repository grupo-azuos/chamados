<script lang="ts" module>
  import { type DataSourceKey, type FilterGroup } from '@template/shared/schemas/dashboard-board.schema';

  /**
   * UM GRUPO "E/OU" DO FILTRO — as condições dele e, dentro, outros grupos (até o teto de níveis
   * do contrato). Recursivo: o grupo de dentro é este mesmo componente. Função pura de props: a
   * árvore inteira sobe a cada mudança (`onChange`).
   */
  export type AzuosFilterGroupEditorProps = {
    data: { source: DataSourceKey; group: FilterGroup; depth?: number };
    actions: { onChange: (group: FilterGroup) => void; onRemove?: () => void };
  };
</script>

<script lang="ts">
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import {
    fieldsOf,
    type FilterRule,
    isFilterGroup,
    ME_VALUE,
  } from '@template/shared/schemas/dashboard-board.schema';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import MultiSelectField from '$lib/components/azuos-multi-select-field/azuos-multi-select-field.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import SelectField from '$lib/components/azuos-select-field/azuos-select-field.svelte';
  import Self from './azuos-filter-group-editor.svelte';
  import {
    canNest,
    emptyGroup,
    emptyRule,
    enumOptionsOf,
    isListOperator,
    needsValue,
    OPERATOR_LABELS,
    operatorsFor,
    RELATIVE_DAY_OPTIONS,
    replaceNode,
    withField,
    withOperator,
  } from '$lib/utils/filter-builder.util';

  let { data, actions }: AzuosFilterGroupEditorProps = $props();

  const depth = $derived(data.depth ?? 1);
  const fields = $derived(fieldsOf(data.source));
  const fieldOptions = $derived(Object.entries(fields).map(([value, field]) => ({ value, label: field.label })));

  function update(id: string, next: FilterRule | FilterGroup | null) {
    actions.onChange(replaceNode(data.group, id, next));
  }

  function textValue(value: FilterRule['value']): string {
    return Array.isArray(value) ? value.join(', ') : String(value ?? '');
  }
</script>

<div class="border-border bg-card rounded-box flex flex-col gap-3 border p-3" role="group" aria-label="Grupo de condições">
  <div class="flex flex-wrap items-center justify-between gap-2">
    <SelectField
      data={{
        value: data.group.combinator,
        options: [
          { value: 'and', label: 'Todas as condições (E)' },
          { value: 'or', label: 'Qualquer condição (OU)' },
        ],
      }}
      ui={{ ariaLabel: 'Como juntar as condições' }}
      actions={{ onChange: (combinator) => actions.onChange({ ...data.group, combinator: combinator as 'and' | 'or' }) }}
    />
    {#if actions.onRemove}
      <ActionButton data={{ label: 'Tirar o grupo' }} ui={{ variant: 'ghost', size: 'sm', icon: Trash2 }} actions={{ onClick: actions.onRemove }} />
    {/if}
  </div>

  {#each data.group.rules as node (node.id)}
    {#if isFilterGroup(node)}
      <Self
        data={{ source: data.source, group: node, depth: depth + 1 }}
        actions={{ onChange: (group) => update(node.id!, group), onRemove: () => update(node.id!, null) }}
      />
    {:else}
      {@const field = fields[node.field]}
      <div class="grid grid-cols-1 items-start gap-2 md:grid-cols-[1fr_1fr_1.4fr_auto]" role="group" aria-label="Condição">
        <OptionPicker
          data={{ value: node.field, options: fieldOptions }}
          ui={{ ariaLabel: 'Campo', fullWidth: true }}
          actions={{ onChange: (value) => update(node.id!, withField(data.source, node, value)) }}
        />
        <SelectField
          data={{
            value: node.operator,
            options: field ? operatorsFor(field).map((operator) => ({ value: operator, label: OPERATOR_LABELS[operator] })) : [],
          }}
          ui={{ ariaLabel: 'Como comparar' }}
          actions={{ onChange: (operator) => update(node.id!, withOperator(node, operator as FilterRule['operator'])) }}
        />
        {#if !field || !needsValue(node.operator)}
          <span></span>
        {:else if field.type === 'boolean'}
          <SelectField
            data={{ value: String(node.value), options: [{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }] }}
            ui={{ ariaLabel: 'Valor' }}
            actions={{ onChange: (value) => update(node.id!, { ...node, value: value === 'true' }) }}
          />
        {:else if field.type === 'enum' && isListOperator(node.operator)}
          <MultiSelectField
            data={{
              values: Array.isArray(node.value) ? node.value.map(String) : [],
              options: enumOptionsOf(field),
              placeholder: 'Escolha as opções',
              noun: 'opções',
            }}
            ui={{ ariaLabel: 'Valores' }}
            actions={{ onChange: (values) => update(node.id!, { ...node, value: values }) }}
          />
        {:else if field.type === 'enum'}
          <OptionPicker
            data={{ value: String(node.value ?? ''), options: enumOptionsOf(field) }}
            ui={{ ariaLabel: 'Valor', fullWidth: true }}
            actions={{ onChange: (value) => update(node.id!, { ...node, value }) }}
          />
        {:else if field.type === 'date' && node.operator === 'between'}
          {@const ends = Array.isArray(node.value) ? node.value.map(String) : ['@monthStart', '@today']}
          <div class="grid grid-cols-2 gap-2" role="group" aria-label="Entre">
            <OptionPicker
              data={{ value: ends[0] ?? '', options: RELATIVE_DAY_OPTIONS }}
              ui={{ ariaLabel: 'De', fullWidth: true, allowCustomValue: true }}
              actions={{ onChange: (value) => update(node.id!, { ...node, value: [value, ends[1] ?? '@today'] }) }}
            />
            <OptionPicker
              data={{ value: ends[1] ?? '', options: RELATIVE_DAY_OPTIONS }}
              ui={{ ariaLabel: 'Até', fullWidth: true, allowCustomValue: true }}
              actions={{ onChange: (value) => update(node.id!, { ...node, value: [ends[0] ?? '@monthStart', value] }) }}
            />
          </div>
        {:else if field.type === 'date'}
          <OptionPicker
            data={{ value: String(node.value ?? ''), options: RELATIVE_DAY_OPTIONS }}
            ui={{ ariaLabel: 'Data (hoje, início do mês ou aaaa-mm-dd)', fullWidth: true, allowCustomValue: true }}
            actions={{ onChange: (value) => update(node.id!, { ...node, value }) }}
          />
        {:else}
          <OptionPicker
            data={{
              value: textValue(node.value),
              options: field.isPerson ? [{ value: ME_VALUE, label: 'Eu (quem estiver vendo)' }] : [],
            }}
            ui={{ ariaLabel: 'Valor', fullWidth: true, allowCustomValue: true, mode: 'combobox' }}
            actions={{ onChange: (value) => update(node.id!, { ...node, value }) }}
          />
        {/if}
        <button
          type="button"
          class="text-ink-500 hover:bg-muted rounded-control control-icon-lg flex items-center justify-center"
          aria-label="Tirar a condição"
          onclick={() => update(node.id!, null)}
        >
          <Trash2 class="size-4" aria-hidden="true" />
        </button>
      </div>
    {/if}
  {/each}

  <div class="flex flex-wrap gap-2">
    <ActionButton
      data={{ label: 'Condição' }}
      ui={{ variant: 'secondary', size: 'sm', icon: Plus }}
      actions={{ onClick: () => actions.onChange({ ...data.group, rules: [...data.group.rules, emptyRule(data.source)] }) }}
    />
    {#if canNest(depth)}
      <ActionButton
        data={{ label: 'Grupo' }}
        ui={{ variant: 'secondary', size: 'sm', icon: Plus }}
        actions={{ onClick: () => actions.onChange({ ...data.group, rules: [...data.group.rules, emptyGroup()] }) }}
      />
    {/if}
  </div>
</div>
