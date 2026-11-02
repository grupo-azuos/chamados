<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import SuggestionTextField from './azuos-suggestion-text-field.svelte';

  const options = ['Kalunga', 'Pichau', 'Terabyte', 'Mercado Livre'];

  const { Story } = defineMeta({
    title: 'Components/AzuosSuggestionTextField',
    component: SuggestionTextField,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ data: { label: 'Fornecedor', name: 'supplier', value: 'Pichau', options }, actions: { onChange: () => {} } }} />

<!-- Nada cadastrado ainda: a mensagem diz o próximo passo. -->
<Story
  name="Empty"
  args={{ data: { label: 'Fornecedor', name: 'supplier', value: '', options: [], emptyMessage: 'Digite o nome: ele fica cadastrado ao salvar.' }, actions: { onChange: () => {} } }}
/>

<Story name="WithError" args={{ data: { label: 'Fornecedor', name: 'supplier', value: '', options }, state: { error: 'Informe o fornecedor', isRequired: true }, actions: { onChange: () => {} } }} />

<Story name="Disabled" args={{ data: { label: 'Fornecedor', name: 'supplier', value: 'Kalunga', options }, state: { isDisabled: true }, actions: { onChange: () => {} } }} />
