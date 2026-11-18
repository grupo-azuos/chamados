<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ComboboxField from './azuos-combobox-field.svelte';

  const options = [
    { value: 'fin', label: 'Financeiro' },
    { value: 'rh', label: 'Recursos Humanos' },
    { value: 'ti', label: 'Tecnologia' },
    { value: 'com', label: 'Comercial' },
    { value: 'jur', label: 'Jurídico' },
  ];

  /* Pessoas inventadas: uma com foto, as outras com as iniciais. */
  const people = [
    { value: 'ana', label: 'Ana Souza', personName: 'Ana Souza', avatarUrl: 'https://i.pravatar.cc/64?img=5' },
    { value: 'caio', label: 'Caio Ribeiro', personName: 'Caio Ribeiro', avatarUrl: null },
    { value: 'dani', label: 'Dani Albuquerque', personName: 'Dani Albuquerque' },
  ];

  const { Story } = defineMeta({
    title: 'Components/AzuosComboboxField',
    component: ComboboxField,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ data: { value: 'ti', options }, ui: { ariaLabel: 'Departamento' }, actions: { onChange: () => {} } }} />

<!-- Com "Criar «termo»" no fim da lista. -->
<Story
  name="Creatable"
  args={{ data: { value: '', options }, ui: { ariaLabel: 'Etiqueta', placeholder: 'Selecione…' }, actions: { onChange: () => {}, onCreate: () => {} } }}
/>

<Story name="Invalid" args={{ data: { value: '', options }, ui: { ariaLabel: 'Departamento', placeholder: 'Selecione…' }, state: { isInvalid: true }, actions: { onChange: () => {} } }} />

<Story name="Disabled" args={{ data: { value: 'rh', options }, ui: { ariaLabel: 'Departamento' }, state: { isDisabled: true }, actions: { onChange: () => {} } }} />

<!-- Seletor de pessoa: a foto (ou as iniciais) vem antes do nome, no gatilho e em cada linha. -->
<Story name="WithPeople" args={{ data: { value: 'ana', options: people }, ui: { ariaLabel: 'Responsável' }, actions: { onChange: () => {} } }} />
