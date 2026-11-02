<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import FormComboboxField from './azuos-form-combobox-field.svelte';

  const options = [
    { value: 'fin', label: 'Financeiro' },
    { value: 'rh', label: 'Recursos Humanos' },
    { value: 'ti', label: 'Tecnologia' },
  ];

  const { Story } = defineMeta({
    title: 'Components/AzuosFormComboboxField',
    component: FormComboboxField,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ data: { label: 'Departamento', value: 'ti', options }, actions: { onChange: () => {} } }} />

<Story name="WithHint" args={{ data: { label: 'Departamento', value: '', options, hint: 'A lista vem do RH' }, actions: { onChange: () => {} } }} />

<Story
  name="WithError"
  args={{ data: { label: 'Departamento', value: '', options }, state: { error: 'Escolha um departamento', isRequired: true }, actions: { onChange: () => {} } }}
/>

<Story name="Disabled" args={{ data: { label: 'Departamento', value: 'rh', options }, state: { isDisabled: true }, actions: { onChange: () => {} } }} />
