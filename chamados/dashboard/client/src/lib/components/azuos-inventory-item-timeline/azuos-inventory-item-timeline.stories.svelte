<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import AzuosInventoryItemTimeline from './azuos-inventory-item-timeline.svelte';

  const { Story } = defineMeta({
    title: 'Manutenção/AzuosInventoryItemTimeline',
    component: AzuosInventoryItemTimeline,
  });

  const sampleEvents = [
    {
      id: 1,
      itemId: 10,
      type: 'observacao' as const,
      description: 'Item alocado na sala de reuniões',
      authorName: 'Ana Silva',
      createdBy: 'ana@empresa.com.br',
      createdAt: '2026-10-01T10:00:00.000Z',
    },
    {
      id: 2,
      itemId: 10,
      type: 'defeito' as const,
      description: 'Braço direito solto e estofado rasgado',
      authorName: 'Carlos Souza',
      createdBy: 'carlos@empresa.com.br',
      createdAt: '2026-10-15T14:30:00.000Z',
    },
    {
      id: 3,
      itemId: 10,
      type: 'troca' as const,
      description: 'Substituído par de braços por modelo ajustável',
      authorName: 'Marcos TI',
      createdBy: 'marcos@empresa.com.br',
      createdAt: '2026-10-20T16:00:00.000Z',
    },
  ];
</script>

<Story
  name="Com ocorrências"
  args={{
    data: {
      events: sampleEvents,
      type: 'observacao',
      description: '',
    },
    state: { isLoading: false, isSubmitting: false },
  }}
/>

<Story
  name="Vazia"
  args={{
    data: {
      events: [],
      type: 'defeito',
      description: '',
    },
    state: { isLoading: false, isSubmitting: false },
  }}
/>

<Story
  name="Carregando"
  args={{
    data: {
      events: [],
      type: 'observacao',
      description: '',
    },
    state: { isLoading: true, isSubmitting: false },
  }}
/>
