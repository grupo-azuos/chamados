<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import PersonPickerField from './azuos-person-picker-field.svelte';

  const people = [
    { id: 'u-ana', name: 'Ana Souza', photo: null },
    { id: 'u-bruno', name: 'Bruno Lima', photo: null },
    { id: 'u-carla', name: 'Carla Dias', photo: null },
  ];

  const { Story } = defineMeta({
    title: 'Components/AzuosPersonPickerField',
    component: PersonPickerField,
    args: { data: { value: '', people }, ui: { ariaLabel: 'Responsável' }, actions: { onChange: fn() } },
  });
</script>

<Story name="Default" />

<Story name="Chosen" args={{ data: { value: 'u-bruno', people } }} />

<!-- Uma opção antes das pessoas, com valor vazio: o "sem responsável". -->
<Story
  name="WithLeading"
  args={{ data: { value: '', people, leading: [{ value: '', label: '(Nenhum)' }] } }}
/>

<!-- Caso limite: ninguém na lista ainda — a busca diz que não achou. -->
<Story name="Empty" args={{ data: { value: '', people: [] } }} />
