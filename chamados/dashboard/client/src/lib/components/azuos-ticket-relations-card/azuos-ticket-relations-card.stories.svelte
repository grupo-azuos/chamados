<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import TicketRelationsCard from './azuos-ticket-relations-card.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosTicketRelationsCard',
    component: TicketRelationsCard,
  });

  const sampleRelations = [
    {
      id: 1,
      ticketId: 10,
      relatedTicketId: 15,
      relatedTicket: {
        id: 15,
        protocol: 'CH-0015',
        description: 'Problema no roteador da recepção',
        status: 'open' as const,
        priority: 'high' as const,
        area: 'infra' as const,
        requesterName: 'Lucas Lima',
        createdAt: '2026-11-05T10:00:00.000Z',
      },
      createdAt: '2026-11-05T12:00:00.000Z',
      createdBy: 'admin@azuos.local',
    },
  ];

  const sampleSearchResults = [
    {
      id: 25,
      protocol: 'CH-0025',
      description: 'Cadeira com defeito no pistão',
      status: 'in_progress' as const,
      priority: 'low' as const,
      area: 'manutencao' as const,
      requesterName: 'Gisele',
      createdAt: '2026-11-05T11:00:00.000Z',
    },
  ];
</script>

<Story
  name="Empty"
  args={{
    data: { relations: [] },
    actions: {
      onSearchChange: () => {},
      onAddRelation: () => {},
      onRemoveRelation: () => {},
    },
  }}
/>

<Story
  name="With Relations"
  args={{
    data: { relations: sampleRelations },
    actions: {
      onSearchChange: () => {},
      onAddRelation: () => {},
      onRemoveRelation: () => {},
    },
  }}
/>

<Story
  name="With Search Results"
  args={{
    data: {
      relations: sampleRelations,
      searchTerm: 'Cadeira',
      searchResults: sampleSearchResults,
    },
    actions: {
      onSearchChange: () => {},
      onAddRelation: () => {},
      onRemoveRelation: () => {},
    },
  }}
/>
