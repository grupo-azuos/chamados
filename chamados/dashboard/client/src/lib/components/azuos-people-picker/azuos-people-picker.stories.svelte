<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import PeoplePicker from './azuos-people-picker.svelte';

  const options = [
    { id: 'u-1', name: 'Ana Lima' },
    { id: 'u-2', name: 'Bia Costa' },
    { id: 'u-3', name: 'Caio Reis' },
    { id: 'u-4', name: 'Maria Aparecida dos Santos Albuquerque Vasconcelos' },
  ];
  const actions = { onChange: () => {} };

  const { Story } = defineMeta({
    title: 'Components/AzuosPeoplePicker',
    component: PeoplePicker,
  });
</script>

<!-- Ninguém escolhido ainda. -->
<Story name="Default" args={{ data: { selectedIds: [], options }, ui: { emptyLabel: 'Ninguém vinculado.' }, actions }} />

<Story name="WithSelection" args={{ data: { selectedIds: ['u-1', 'u-3'], options }, actions }} />

<!-- Nome comprido na ficha: corta, não estica a linha. -->
<Story name="LongName" args={{ data: { selectedIds: ['u-4', 'u-1', 'u-2'], options }, actions }} />

<Story name="Loading" args={{ data: { selectedIds: [], options: [] }, state: { isLoading: true }, actions }} />

<Story name="Disabled" args={{ data: { selectedIds: ['u-2'], options }, state: { isDisabled: true }, actions }} />

<Story
  name="WithError"
  args={{ data: { selectedIds: [], options }, state: { error: 'Vincule até 20 pessoas' }, actions }}
/>
