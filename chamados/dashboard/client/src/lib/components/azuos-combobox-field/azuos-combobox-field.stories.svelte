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
