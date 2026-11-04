<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import CreatableComboboxField from './azuos-creatable-combobox-field.svelte';

  const actions = { onChange: () => {}, onSearch: () => {}, onCreate: () => {} };

  const { Story } = defineMeta({
    title: 'Components/AzuosCreatableComboboxField',
    component: CreatableComboboxField,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="Default"
  args={{ data: { value: 'Goiânia', options: ['Goiânia', 'Anápolis', 'Aparecida de Goiânia'] }, ui: { ariaLabel: 'Cidade', placeholder: 'Escolha a cidade', searchPlaceholder: 'Buscar cidade', clearLabel: 'Sem cidade' }, actions }}
/>

<Story name="Loading" args={{ data: { value: '', options: [] }, ui: { ariaLabel: 'Cidade', placeholder: 'Escolha a cidade' }, state: { isLoading: true }, actions }} />

<Story name="Creating" args={{ data: { value: 'Trindade', options: [] }, ui: { ariaLabel: 'Cidade' }, state: { isCreating: true }, actions }} />

<Story name="Disabled" args={{ data: { value: 'Anápolis', options: [] }, ui: { ariaLabel: 'Cidade' }, state: { isDisabled: true }, actions }} />
