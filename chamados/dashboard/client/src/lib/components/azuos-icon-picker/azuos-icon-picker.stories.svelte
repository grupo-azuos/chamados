<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Laptop from '@lucide/svelte/icons/laptop';
  import Monitor from '@lucide/svelte/icons/monitor';
  import Printer from '@lucide/svelte/icons/printer';
  import Router from '@lucide/svelte/icons/router';

  import IconPicker from './azuos-icon-picker.svelte';

  const options = [
    { value: 'monitor', label: 'Monitor', icon: Monitor },
    { value: 'laptop', label: 'Notebook', icon: Laptop },
    { value: 'printer', label: 'Impressora', icon: Printer },
    { value: 'router', label: 'Roteador', icon: Router },
  ];

  const { Story } = defineMeta({
    title: 'Components/AzuosIconPicker',
    component: IconPicker,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="Default"
  args={{ data: { value: 'printer', options }, ui: { label: 'Ícone do tipo' }, actions: { onChange: () => {} } }}
/>

<!-- Nada escolhido ainda. -->
<Story
  name="Empty"
  args={{ data: { value: null, options }, ui: { label: 'Ícone do tipo' }, actions: { onChange: () => {} } }}
/>

<Story
  name="Disabled"
  args={{
    data: { value: 'monitor', options },
    ui: { label: 'Ícone do tipo' },
    state: { isDisabled: true },
    actions: { onChange: () => {} },
  }}
/>
