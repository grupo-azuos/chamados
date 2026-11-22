<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import PersonMultiPickerField from './azuos-person-multi-picker-field.svelte';

  const people = [
    { id: 'u-ana', name: 'Ana Souza', photo: null },
    { id: 'u-bruno', name: 'Bruno Lima', photo: null },
    { id: 'u-carla', name: 'Carla Dias', photo: null },
  ];

  const { Story } = defineMeta({
    title: 'Components/AzuosPersonMultiPickerField',
    component: PersonMultiPickerField,
    args: { data: { values: [], people }, ui: { ariaLabel: 'Quem acompanha' }, actions: { onChange: fn() } },
  });
</script>

<Story name="Default" />

<Story name="Chosen" args={{ data: { values: ['u-ana', 'u-carla'], people } }} />

<!-- Caso limite: todo mundo escolhido — o botão resume na contagem. -->
<Story name="Everyone" args={{ data: { values: people.map((person) => person.id), people } }} />
