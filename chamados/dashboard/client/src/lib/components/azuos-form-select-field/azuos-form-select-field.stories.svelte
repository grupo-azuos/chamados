<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import FormSelectField from './azuos-form-select-field.svelte';

  const options = [
    { value: 'user', label: 'Usuário' },
    { value: 'manager', label: 'Gestor' },
    { value: 'admin', label: 'Administrador' },
  ];

  const { Story } = defineMeta({
    title: 'Components/AzuosFormSelectField',
    component: FormSelectField,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ data: { label: 'Papel', value: 'user', options } }} />

<Story name="WithHint" args={{ data: { label: 'Papel', value: 'user', options, hint: 'Gestor só libera o nível Usuário' }, state: { isDisabled: true } }} />

<Story name="WithError" args={{ data: { label: 'Papel', value: '', options }, state: { error: 'Escolha um papel', isRequired: true } }} />

<!-- Numa linha de tabela: o rótulo fica só para o leitor de tela. -->
<Story name="HiddenLabel" args={{ data: { label: 'Papel', value: 'admin', options }, ui: { isLabelHidden: true } }} />
