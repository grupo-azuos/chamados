<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import TicketStockLinks from './azuos-ticket-stock-links.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosTicketStockLinks',
    component: TicketStockLinks,
  });
</script>

<Story
  name="Default"
  args={{
    data: {
      links: [{ ticketId: 49, protocol: 'CH-0049', direction: 'out', quantity: 2 }],
      balance: 11,
      ticketsPath: '/infra/tickets',
    },
  }}
/>

<Story
  name="Out and back in"
  args={{
    data: {
      links: [
        { ticketId: 49, protocol: 'CH-0049', direction: 'out', quantity: 2 },
        { ticketId: 52, protocol: 'CH-0052', direction: 'in', quantity: 1 },
      ],
      balance: 1,
      ticketsPath: '/maintenance/tickets',
    },
  }}
/>

<!-- Caso limite: dez chamados prendendo o mesmo item — o cartão não cresce. -->
<Story
  name="Ten tickets"
  args={{
    data: {
      links: Array.from({ length: 10 }, (_, index) => ({
        ticketId: 40 + index,
        protocol: `CH-00${40 + index}`,
        direction: 'out',
        quantity: 1,
      })),
      balance: 11,
      ticketsPath: '/infra/tickets',
    },
  }}
/>

<!-- Caso limite: item sem chamado — não desenha nada. -->
<Story name="No ticket" args={{ data: { links: [], balance: 3, ticketsPath: '/infra/tickets' } }} />
