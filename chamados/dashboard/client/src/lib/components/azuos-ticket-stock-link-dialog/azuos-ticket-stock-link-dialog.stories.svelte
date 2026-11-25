<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import Component from './azuos-ticket-stock-link-dialog.svelte';

  /** Vincular itens do estoque: a máquina de um lado, os itens (com quantidade) do outro — 1 para vários. */
  const { Story } = defineMeta({ title: 'Components/AzuosTicketStockLinkDialog', component: Component, tags: ['autodocs'] });
</script>

<script lang="ts">
  const actions = {
    onMachineChange: fn(),
    onDirectionChange: fn(),
    onSearch: fn(),
    onToggle: fn(),
    onQuantityChange: fn(),
    onApply: fn(),
    onClose: fn(),
  };
  const base = {
    machines: [
      { value: '6', label: 'Computador 06' },
      { value: '7', label: 'Notebook 01' },
    ],
    machineId: '6',
    direction: 'out' as const,
    options: [
      { id: 1, name: 'Monitor 24"', available: 2 },
      { id: 2, name: 'Teclado ABNT2', available: 5 },
      { id: 3, name: 'Mouse USB', available: 8 },
    ],
    search: '',
    shelfLabel: 'Depósito da TI',
  };
</script>

<Story name="Default" args={{ data: { ...base, selection: { '1': '2', '3': '1' } }, state: { isOpen: true }, actions }} />
<Story name="Nada marcado" args={{ data: { ...base, selection: {} }, state: { isOpen: true }, actions }} />
<Story name="Sem item" args={{ data: { ...base, options: [], selection: {} }, state: { isOpen: true }, actions }} />
