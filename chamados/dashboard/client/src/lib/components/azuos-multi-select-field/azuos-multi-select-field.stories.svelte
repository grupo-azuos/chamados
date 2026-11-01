<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import MultiSelectField from './azuos-multi-select-field.svelte';

  const options = [
    { value: 'infra', label: 'Infraestrutura' },
    { value: 'sistema', label: 'Sistemas' },
    { value: 'manutencao', label: 'Manutenção' },
  ];
  const base = { options, placeholder: 'Todas as áreas', noun: 'áreas' };

  const { Story } = defineMeta({
    title: 'Components/AzuosMultiSelectField',
    component: MultiSelectField,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Empty" args={{ data: { ...base, values: [] }, ui: { ariaLabel: 'Área' }, actions: { onChange: () => {} } }} />

<Story name="Two" args={{ data: { ...base, values: ['infra', 'sistema'] }, ui: { ariaLabel: 'Área' }, actions: { onChange: () => {} } }} />

<Story name="Count" args={{ data: { ...base, values: ['infra', 'sistema', 'manutencao'] }, ui: { ariaLabel: 'Área' }, actions: { onChange: () => {} } }} />

<Story name="Disabled" args={{ data: { ...base, values: ['infra'] }, ui: { ariaLabel: 'Área' }, state: { isDisabled: true }, actions: { onChange: () => {} } }} />
