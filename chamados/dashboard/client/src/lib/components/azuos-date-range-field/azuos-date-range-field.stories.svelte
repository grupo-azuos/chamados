<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import DateRangeField from './azuos-date-range-field.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosDateRangeField',
    component: DateRangeField,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Empty" args={{ data: { label: 'Período', name: 'period', value: { from: null, to: null } }, actions: { onChange: () => {} } }} />

<Story name="WithValue" args={{ data: { label: 'Período', name: 'period', value: { from: '2026-03-01', to: '2026-03-31' } }, actions: { onChange: () => {} } }} />

<Story name="WithError" args={{ data: { label: 'Período', name: 'period', value: { from: null, to: null } }, state: { error: 'Escolha o período' }, actions: { onChange: () => {} } }} />

<Story name="Disabled" args={{ data: { label: 'Período', name: 'period', value: { from: '2026-03-01', to: '2026-03-31' } }, state: { isDisabled: true }, actions: { onChange: () => {} } }} />
