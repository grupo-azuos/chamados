<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import MonthPickerField from './azuos-month-picker-field.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosMonthPickerField',
    component: MonthPickerField,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Empty" args={{ data: { label: 'Competência', value: '' }, actions: { onChange: () => {} } }} />

<Story name="WithValue" args={{ data: { label: 'Competência', value: '2025-10' }, actions: { onChange: () => {} } }} />

<!-- Sem rótulo: o filtro de uma lista. -->
<Story name="Filter" args={{ data: { value: '' }, ui: { ariaLabel: 'Mês', placeholder: 'Todos os meses' }, actions: { onChange: () => {} } }} />

<Story name="WithError" args={{ data: { label: 'Competência', value: '' }, state: { error: 'Escolha o mês', isRequired: true }, actions: { onChange: () => {} } }} />
