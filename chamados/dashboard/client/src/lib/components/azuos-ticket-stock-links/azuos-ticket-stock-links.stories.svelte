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
      ticketsPath: '/maintenance/tickets',
    },
  }}
/>

<!-- Caso limite: item sem chamado — não desenha nada. -->
<Story name="No ticket" args={{ data: { links: [], ticketsPath: '/infra/tickets' } }} />
