<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import MaskedTextField from './azuos-masked-text-field.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosMaskedTextField',
    component: MaskedTextField,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Cpf" args={{ data: { label: 'CPF', name: 'cpf', value: '' }, ui: { mask: 'cpf' }, actions: { onChange: () => {} } }} />

<Story name="Phone" args={{ data: { label: 'Telefone', name: 'phone', value: '62912345678' }, ui: { mask: 'phone' }, actions: { onChange: () => {} } }} />

<Story name="Money" args={{ data: { label: 'Valor do orçamento', name: 'amount', value: '' }, ui: { mask: 'money' }, actions: { onChange: () => {} } }} />

<Story
  name="WithError"
  args={{ data: { label: 'CNPJ', name: 'cnpj', value: '', isRequired: true }, ui: { mask: 'cnpj' }, state: { error: 'Informe o CNPJ' }, actions: { onChange: () => {} } }}
/>

<Story name="Disabled" args={{ data: { label: 'CEP', name: 'cep', value: '74230220' }, ui: { mask: 'cep' }, state: { isDisabled: true }, actions: { onChange: () => {} } }} />
