<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import DateStepper from './azuos-date-stepper.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosDateStepper',
    component: DateStepper,
    parameters: { layout: 'padded' },
  });
</script>

<!-- Vazio: começa pelo ano. -->
<Story name="Empty" args={{ data: { value: null }, actions: { onChange: () => {} } }} />

<!-- Com data: abre no dia, ano e mês no topo para trocar. -->
<Story name="WithValue" args={{ data: { value: '2025-03-25' }, actions: { onChange: () => {} } }} />

<!-- Com limites: o que está fora fica desligado. -->
<Story name="Limited" args={{ data: { value: null, min: '2024-06-15', max: '2026-12-31' }, ui: { startYear: 2025 }, actions: { onChange: () => {} } }} />
