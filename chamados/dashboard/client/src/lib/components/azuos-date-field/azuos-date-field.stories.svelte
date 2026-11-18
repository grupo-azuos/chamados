<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import DateField from './azuos-date-field.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosDateField',
    component: DateField,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Empty" args={{ data: { label: 'Data da compra', name: 'boughtAt', value: null }, actions: { onChange: () => {} } }} />

<Story name="WithValue" args={{ data: { label: 'Data da compra', name: 'boughtAt', value: '2024-03-25' }, actions: { onChange: () => {} } }} />

<Story
  name="WithError"
  args={{ data: { label: 'Vencimento da garantia', name: 'warranty', value: null, isRequired: true }, state: { error: 'Informe o vencimento' }, actions: { onChange: () => {} } }}
/>

<Story name="Disabled" args={{ data: { label: 'Data da compra', name: 'boughtAt', value: '2024-03-25' }, state: { isDisabled: true }, actions: { onChange: () => {} } }} />
