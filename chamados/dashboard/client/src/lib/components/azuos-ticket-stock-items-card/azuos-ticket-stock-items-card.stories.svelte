<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import TicketStockItemsCard from './azuos-ticket-stock-items-card.svelte';

  const options = [
    { id: 1, name: 'Mouse USB', available: 3 },
    { id: 2, name: 'Monitor 24"', available: 1 },
    { id: 3, name: 'Teclado ABNT2', available: 0 },
  ];
  const items = [
    {
      id: 10,
      ticketId: 49,
      source: 'parts' as const,
      itemId: 2,
      name: 'Monitor 24"',
      direction: 'out' as const,
      quantity: 1,
      settledAt: null,
      createdAt: '2026-11-12T12:00:00.000Z',
      createdByName: 'Ana Lima',
    },
    {
      id: 11,
      ticketId: 49,
      source: 'parts' as const,
      itemId: 4,
      name: 'Monitor 22" com a tela de cor trocada, devolvido para conserto',
      direction: 'in' as const,
      quantity: 1,
      settledAt: null,
      createdAt: '2026-11-12T12:05:00.000Z',
      createdByName: 'Ana Lima',
    },
  ];
  const values = { itemId: '', direction: 'out' as const, quantity: '1' };
  const actions = { onChange: () => {}, onSubmit: () => {}, onRemove: () => {} };

  const { Story } = defineMeta({
    title: 'Components/AzuosTicketStockItemsCard',
    component: TicketStockItemsCard,
  });
</script>

<Story
  name="Default"
  args={{ data: { items, options, values }, ui: { shelfLabel: 'Depósito da TI' }, actions }}
/>

<Story name="Empty" args={{ data: { items: [], options, values }, actions }} />

<Story name="Loading" args={{ data: { items: [], options: [], values }, state: { isLoading: true }, actions }} />

<Story
  name="Closed ticket"
  args={{
    data: {
      items: items.map((item) => ({ ...item, settledAt: '2026-11-12T15:00:00.000Z' })),
      options,
      values,
    },
    state: { isClosed: true },
    actions,
  }}
/>

<Story
  name="Refused"
  args={{
    data: { items, options, values: { ...values, quantity: '0' }, errors: { quantity: 'A quantidade mínima é 1' } },
    state: { error: 'Só há 1 de Monitor 24" disponível no depósito.' },
    actions,
  }}
/>

<Story
  name="Adding"
  args={{ data: { items, options, values: { itemId: '1', direction: 'out', quantity: '2' } }, state: { isAdding: true }, actions }}
/>
