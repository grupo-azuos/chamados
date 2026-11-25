<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import NewItemForm from './azuos-ticket-stock-new-item.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosTicketStockNewItem',
    component: NewItemForm,
    args: { actions: { onChange: fn(), onSave: fn(), onCancel: fn() } },
  });

  const values = { name: 'Fonte ATX', quantity: '2', category: 'other', condition: 'new', unit: 'unit' };
</script>

<!-- A peça da TI: categoria e condição. -->
<Story name="Peça da TI" args={{ data: { source: 'parts', values } }} />

<!-- O produto da Manutenção: categoria e medida. -->
<Story name="Produto da Manutenção" args={{ data: { source: 'inventory', values: { ...values, category: 'furniture' } } }} />

<Story name="Cadastrando" args={{ data: { source: 'parts', values }, state: { isSaving: true } }} />

<!-- Caso limite: o que falta e a recusa do servidor. -->
<Story
  name="Com erros (edge case)"
  args={{
    data: {
      source: 'parts',
      values: { ...values, name: '', category: '' },
      errors: { name: 'Diga o nome do item', category: 'Escolha a categoria' },
    },
    state: { error: 'Seu cargo nesta área só permite consultar.' },
  }}
/>
